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
  loadingTemplateUrl: string,
  loadingTemplateString: string,
  debug: boolean;
}
