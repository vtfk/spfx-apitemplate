export interface ITemplateWebpartProps {
  type: string,
  dataUrl: string,
  method: string,
  headers: string,
  body: string,
  username: string,
  password: string,
  oauthClientId: string,
  oauthAuthorityUrl: string,
  oauthScopes: string,
  templateUrl: string;
  templateString: string;
  errorTemplateUrl: string,
  errorTemplateString: string,
  loadingType: string,
  mockLoading: boolean,
  loadingTemplateUrl: string,
  loadingTemplateString: string,
  minHeight: string,
  maxHeight: string,
  debug: boolean;
}
