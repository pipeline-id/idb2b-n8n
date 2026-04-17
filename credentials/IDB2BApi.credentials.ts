import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  IHttpRequestOptions,
} from "n8n-workflow";
import { getAccessToken } from "../nodes/IDB2B/utils/httpClient";

export class IDB2BApi implements ICredentialType {
  name = "idb2bApi";
  displayName = "IDB2B WhatsApp AI Agents";
  documentationUrl = "https://idb2b.com/en";
  icon = "file:IDB2B.svg" as const;

  authenticate = async function (
    this: any,
    credentials: any,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    const accessToken = await getAccessToken(this as any, credentials);

    requestOptions.headers = {
      ...requestOptions.headers,
      Authorization: `Bearer ${accessToken}`,
    };
    return requestOptions;
  };

  properties: INodeProperties[] = [
    {
      displayName: "Email",
      name: "email",
      type: "string",
      default: "",
      required: true,
      placeholder: "your@email.com",
    },
    {
      displayName: "Password",
      name: "password",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.idb2b.com",
      required: true,
      description:
        "The IDB2B API base URL. Use https://api-stage.idb2b.com for staging environment.",
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/login",
      method: "POST",
      body: {
        email: "={{$credentials.email}}",
        password: "={{$credentials.password}}",
      },
    },
  };
}
