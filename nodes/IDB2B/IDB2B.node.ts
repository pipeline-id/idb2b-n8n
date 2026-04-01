import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  NodeOperationError,
} from "n8n-workflow";
import {
  contactOperations,
  contactFields,
} from "./descriptions/contactProperties";
import {
  companyOperations,
  companyFields,
} from "./descriptions/companyProperties";

// Import new utility modules
import { defaultValidator } from "./utils/validators";
import { defaultErrorHandler } from "./utils/errorHandler";
import { HttpClient, getAccessToken } from "./utils/httpClient";
import { secureTokenCache } from "./utils/tokenCache";
import {
  buildQueryString,
  sanitizeId,
  filterContactFields,
  filterCompanyFields,
  applyFieldFiltering,
  processResponse,
  buildContactRequestBody,
  buildCompanyRequestBody,
} from "./utils/common";
import { ENDPOINTS, PAGINATION } from "./config/constants";

export class IDB2B implements INodeType {
  description: INodeTypeDescription = {
    displayName: "IDB2B API",
    name: "idb2b",
    icon: "file:Icon.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      "AI Agents that turn conversations into customers for WhatsApp, Instagram & TikTok",
    defaults: {
      name: "IDB2B",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "idb2bApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Contact",
            value: "contact",
          },
          {
            name: "Company",
            value: "company",
          },
        ],
        default: "contact",
      },
      contactOperations,
      companyOperations,
      ...contactFields,
      ...companyFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const errorHandler = defaultErrorHandler;
    const validator = defaultValidator;

    // Time-based cleanup of expired tokens
    secureTokenCache.cleanupIfNeeded();

    // Fetch credentials and token once before the loop
    const credentials = await this.getCredentials("idb2bApi");

    // Validate credentials
    const credentialsValidation = validator.validateCredentials(credentials);
    if (!credentialsValidation.isValid) {
      throw new NodeOperationError(
        this.getNode(),
        credentialsValidation.error || "Invalid credentials",
      );
    }

    const accessToken = await getAccessToken(this, credentials);
    const httpClient = new HttpClient(this);

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter("resource", i) as string;
        const operation = this.getNodeParameter("operation", i) as string;

        let method: IHttpRequestMethods = "GET";
        let endpoint = "";
        let body: any = undefined;
        let qs: any = {};
        let initialBody: any = undefined;

        if (resource === "contact") {
          if (operation === "getAll") {
            method = "GET";
            endpoint = ENDPOINTS.CONTACTS;

            const limit = this.getNodeParameter(
              "limit",
              i,
              PAGINATION.DEFAULT_LIMIT,
            ) as number;
            const page = this.getNodeParameter(
              "page",
              i,
              PAGINATION.DEFAULT_PAGE,
            ) as number;
            qs.limit = limit;
            qs.page = page;

            const queryParameters = this.getNodeParameter(
              "queryParameters",
              i,
              {},
            ) as any;
            const additionalQs = buildQueryString(queryParameters);
            qs = { ...qs, ...additionalQs };
          } else if (operation === "get") {
            method = "GET";
            const contactId = this.getNodeParameter("contactId", i) as string;
            endpoint = `${ENDPOINTS.CONTACTS}/${sanitizeId(contactId)}`;
          } else if (operation === "create") {
            method = "POST";
            endpoint = ENDPOINTS.CONTACTS;
            const name = this.getNodeParameter("name", i) as string;
            const email = (this.getNodeParameter("email", i, "") as string) || "";
            const phone_number =
              (this.getNodeParameter("phone_number", i, "") as string) || "";
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
              {},
            ) as any;

            const validation = validator.validateContactData(
              name,
              email,
              phone_number,
              false,
            );
            if (!validation.isValid) {
              throw new Error(validation.error);
            }

            const contactData: Record<string, any> = { name, ...additionalFields };
            if (email) contactData.email = email;
            if (phone_number) contactData.phone_number = phone_number;
            body = buildContactRequestBody(contactData);
            // DEBUG: remove after fix confirmed
            console.log('[IDB2B DEBUG] contact create body:', JSON.stringify(body));
            console.log('[IDB2B DEBUG] raw params - email:', JSON.stringify(email), 'phone:', JSON.stringify(phone_number), 'additionalFields:', JSON.stringify(additionalFields));
            initialBody = body;
          } else if (operation === "update") {
            method = "PATCH";
            const contactId = this.getNodeParameter("contactId", i) as string;
            endpoint = `${ENDPOINTS.CONTACTS}/${sanitizeId(contactId)}`;

            const name = this.getNodeParameter("name", i, "") as string;
            const email = this.getNodeParameter("email", i, "") as string;
            const phone_number = this.getNodeParameter(
              "phone_number",
              i,
              "",
            ) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
              {},
            ) as any;

            if (name) {
              const validation = validator.validateContactData(name);
              if (!validation.isValid) {
                throw new Error(validation.error);
              }
            }
            if (email) {
              const validation = validator.validateEmailField(email);
              if (!validation.isValid) {
                throw new Error(validation.error);
              }
            }

            body = buildContactRequestBody(
              {
                ...(name ? { name } : {}),
                ...(email ? { email } : {}),
                ...(phone_number ? { phone_number } : {}),
                ...additionalFields,
              },
              true,
            );
            initialBody = body;
          } else if (operation === "delete") {
            method = "DELETE";
            const contactId = this.getNodeParameter("contactId", i) as string;
            endpoint = `${ENDPOINTS.CONTACTS}/${sanitizeId(contactId)}`;
          }
        } else if (resource === "company") {
          if (operation === "getAll") {
            method = "GET";
            endpoint = ENDPOINTS.COMPANIES;

            const limit = this.getNodeParameter(
              "limit",
              i,
              PAGINATION.DEFAULT_LIMIT,
            ) as number;
            const page = this.getNodeParameter(
              "page",
              i,
              PAGINATION.DEFAULT_PAGE,
            ) as number;
            qs.limit = limit;
            qs.page = page;

            const queryParameters = this.getNodeParameter(
              "queryParameters",
              i,
              {},
            ) as any;
            const additionalQs = buildQueryString(queryParameters);
            qs = { ...qs, ...additionalQs };
          } else if (operation === "get") {
            method = "GET";
            const companyId = this.getNodeParameter("companyId", i) as string;
            endpoint = `${ENDPOINTS.COMPANIES}/${sanitizeId(companyId)}`;
          } else if (operation === "create") {
            method = "POST";
            endpoint = ENDPOINTS.COMPANIES;
            const name = this.getNodeParameter("name", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
              {},
            ) as any;

            const validation = validator.validateCompanyData(name);
            if (!validation.isValid) {
              throw new Error(validation.error);
            }

            body = buildCompanyRequestBody({
              name,
              ...additionalFields,
            });
            initialBody = body;
          } else if (operation === "update") {
            method = "PATCH";
            const companyId = this.getNodeParameter("companyId", i) as string;
            endpoint = `${ENDPOINTS.COMPANIES}/${sanitizeId(companyId)}`;

            const name = this.getNodeParameter("name", i, "") as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
              {},
            ) as any;

            body = {};
            if (name) {
              const validation = validator.validateCompanyData(name);
              if (!validation.isValid) {
                throw new Error(validation.error);
              }
              body.name = name.trim();
            }

            // Add additional fields
            Object.keys(additionalFields).forEach((key) => {
              if (
                additionalFields[key] !== undefined &&
                additionalFields[key] !== ""
              ) {
                body[key] = additionalFields[key];
              }
            });
            initialBody = body;
          } else if (operation === "delete") {
            method = "DELETE";
            const companyId = this.getNodeParameter("companyId", i) as string;
            endpoint = `${ENDPOINTS.COMPANIES}/${sanitizeId(companyId)}`;
          }
        }

        // DEBUG: remove after fix confirmed
        if (operation === "create" && resource === "contact") {
          throw new NodeOperationError(
            this.getNode(),
            new Error(`DEBUG body sent: ${JSON.stringify(body)}`),
            { itemIndex: i },
          );
        }

        const response = await httpClient.makeRequest({
          method,
          url: `${credentials.baseUrl}${endpoint}`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body,
          qs,
          json: true,
        });

        let processedResponse = processResponse(
          response,
          operation,
          initialBody,
        );

        // Apply field filtering for getAll operations
        if (operation === "getAll") {
          const fieldsToReturn = this.getNodeParameter(
            "fields",
            i,
            [],
          ) as string[];
          if (resource === "contact") {
            processedResponse = applyFieldFiltering(
              response,
              fieldsToReturn,
              filterContactFields,
            );
          } else if (resource === "company") {
            processedResponse = applyFieldFiltering(
              response,
              fieldsToReturn,
              filterCompanyFields,
            );
          }
        }

        returnData.push({
          json: processedResponse as any,
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          const errorData = errorHandler.extractErrorDetails(error);

          if (
            error instanceof Error &&
            "response" in error &&
            (error as any).response
          ) {
            const response = (error as any).response as any;
            const statusCode = response.status || response.statusCode;

            if (statusCode === 401) {
              const cacheKey = `${credentials.baseUrl}:${credentials.email}`;
              secureTokenCache.invalidate(cacheKey);
            }

            const mapping = errorHandler.mapHttpError(statusCode, response);
            errorData.error = mapping.message;
          }

          returnData.push({
            json: errorData,
            pairedItem: { item: i },
          });
          continue;
        }
        let errorMsg = (error as Error).message;
        if (
          error instanceof Error &&
          "response" in error &&
          (error as any).response?.data
        ) {
          try {
            const apiError = (error as any).response.data;
            errorMsg += ` | API response: ${typeof apiError === "string" ? apiError : JSON.stringify(apiError)}`;
          } catch {}
        }
        throw new NodeOperationError(
          this.getNode(),
          new Error(errorMsg),
          { itemIndex: i },
        );
      }
    }

    return [returnData];
  }
}
