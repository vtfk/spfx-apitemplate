import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface ITemplateWebpartProps {
  type: string,
  data: string,
  dataUrl: string,
  method: string,
  headers: string,
  body: string,
  username: string,
  password: string,
  msappClientId: string,
  msappAuthorityUrl: string,
  msappScopes: string,
  templateUrl: string;
  templateString: string;
  loadingType: string,
  mockLoading: boolean,
  minHeight: string,
  maxHeight: string,
  webpartContext: WebPartContext,
  debug: boolean;
}
