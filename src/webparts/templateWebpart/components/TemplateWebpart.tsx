import * as React from 'react';
import styles from './TemplateWebpart.module.scss';
import { ITemplateWebpartProps } from './ITemplateWebpartProps';
import { isEqual, sortBy, times } from 'lodash'
import Sjablong from 'sjablong'
import handlebars from 'handlebars';
import { nanoid } from 'nanoid';
import axios, { AxiosRequestConfig } from 'axios';
import { Shimmer, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import * as msal from '@azure/msal-browser'
import sanitizeObject from '../../../lib/sanitizeObject'

export interface ITemplateWebpartState {
  id: string,
  isAuthenticating: boolean,
  isLoading: boolean,
  loadingMessage: string,
  propErrors: string[]
  error: any,
  data: any;
  bearerToken: string;
  loadingTemplateBody: string;
  html: string;
  authHeaders: object,
  authExpirationISO: String
}

const urlRegex = /((\w+:\/\/)[-a-zA-Z0-9:@;?&=\/%\+\.\*!'\(\),\$_\{\}\^~\[\]`#|]+)/g

export default class TemplateWebpart extends React.Component<ITemplateWebpartProps, ITemplateWebpartState> {
  /*
    Constructor
  */
  public constructor(props: ITemplateWebpartProps) {
    super(props);
  }

  /*
    State
  */
  public state = {
    id: nanoid(),
    isAuthenticating: false,
    isLoading: false,
    loadingMessage: '',
    propErrors: [],
    error: undefined,
    bearerToken: undefined,
    data: undefined,
    loadingTemplateBody: '',
    html: '',
    authHeaders: undefined,
    authExpirationISO: undefined
  }

  /*
    LifeCycle hooks
  */
  // Runs only when the component first loads
  public componentDidMount = async () => {
    this.debug('=== Webpart Mounted ===');
    this.debug('Props', this.props)
    await this.runActions(undefined, undefined);
  }

  // Runs data for the components updates and triggers a re-render
  public componentDidUpdate = async (prevProps : ITemplateWebpartProps, prevState : ITemplateWebpartState) => {
    this.debug('=== Webpart Updated ===');
    await this.runActions(prevProps, prevState);
  }

  /*
    Support function
  */
  // Console.logs if the debug-prop is true
  private debug(...args : any[]) {
    if(!this.props?.debug) return;
    console.log(...args)
  }

  // Check if properties between two objects are identical
  private isAllEqual(obj1 : Object, obj2 : Object, properties: string[]) : Boolean {
    if(!obj1 || !obj2 || !properties) return false;

    let isAllEqual = true;

    for(const prop of properties) {
      if(isEqual(obj1[prop], obj2[prop])) continue;
      isAllEqual = false;
      break
    }

    return isAllEqual;
  }

  // Validate all props
  private async validateProps (props : ITemplateWebpartProps) {
    const errors = [];

    if(!props.type) errors.push('type must be provided');
    if(!props.method) errors.push('method must be provided');
    if(props.type === 'basic') {
      if(!props.username) errors.push('username must be provided when authentication basic is used');
      if(!props.password) errors.push('password must be provided when authentication basic is used');
    } else if (props.type === 'msapp') {
      if(!props.msappClientId) errors.push('msappClientId must be provided when authentication msapp is used');
      if(!props.msappAuthorityUrl) errors.push('msappAuthorityUrl must be provided when authentication msapp is used');
      if(!props.msappScopes) errors.push('msappScopes must be provided when authentication msapp is used');
      if(!urlRegex.test(props.msappAuthorityUrl)) errors.push('msappAuthorityUrl is not in a valid url format');
    }
    if(!props.dataUrl) errors.push('dataUrl must be provided');
    if(props.dataUrl && !urlRegex.test(props.dataUrl)) errors.push('dataUrl is not in a valid url format');
    if(!props.templateUrl && !props.templateString) errors.push('templateUrl or templateString must be provided');
    if(props.templateUrl && !urlRegex.test(props.templateUrl)) errors.push('templateUrl is not in a valid url format');

    return errors;
  }

  /*
    Functions
  */
  // Main function that run every needed action
  private async runActions(prevProps : ITemplateWebpartProps, prevState : ITemplateWebpartState) {
    // If loading there is no
    if(this.state.isLoading || this.props.mockLoading) return;
    // If the props is identical to the last run there is not necessary to run again
    if(isEqual(prevProps, this.props)) {
      this.debug('The current and previous props are identical, no actions needed');
      return;
    }

    /*
      Validate the properties
      This must be done everytime before doing anything else
    */
    // Retreive all current prop errors
    const propErrors = await this.validateProps(this.props);
    // Retreive all previous prop errors
    let previousErrors : String[] = prevState?.propErrors || [];
    // Sort the error sets
    const sortedErrors = sortBy(propErrors, (i) => i)
    previousErrors = sortBy(previousErrors, (i) => i)

    // If there are existing errors and they are the same as the previous error
    if (propErrors.length > 0 && isEqual(sortedErrors, previousErrors)) {
      this.debug('There are errors, returning early')
      return
    }
    // If there is errors and they are not identical to the previous errors 
    else if (propErrors.length > 0 && !isEqual(sortedErrors, previousErrors)) {
      this.debug('There are one or more new errors', propErrors);
      this.setState({ propErrors })
      return;
    }
    // If there was an error, but it has been resolved
    else if (propErrors.length === 0 && previousErrors.length > 0) {
      this.debug('All prop-errors has been resolved')
      this.setState({propErrors: []})
    }

    // If there are prop errors there is no need to continue
    if(propErrors.length > 0) return;

    /*
      Determine what actions must be done
    */
    let mustAuthenticate = false;
    let mustFetchData = false;
    let mustRerender = true;

    // Check if it is time to authenticate again
    let authHeaders : any = this.state.authHeaders || {}
    switch(this.props.type) {
      case 'basic':
        mustAuthenticate = !authHeaders || !this.isAllEqual(this.props, prevProps, ['username', 'password']);
        break;
      case 'msgraph':
        mustAuthenticate = true;
        break;
      case 'msapp':
        mustAuthenticate = !authHeaders || !this.isAllEqual(this.props, prevProps, ['type', 'msappClientId', 'msappAuthorityUrl', 'msappScopes', 'headers', 'authHeaders'])
        break;
    }
    // Attempt to figure out if the authToken has expired
    if(this.state.authExpirationISO && typeof this.state.authExpirationISO === 'string') {
      try {
        const expirationTimestamp = new Date(this.state.authExpirationISO);
        expirationTimestamp.toISOString();  // This will throw if not valid
        if(expirationTimestamp < new Date()) {
          this.debug('Authentication token has expired and must be renewed');
          mustAuthenticate = true;
        }
      } catch {}
    }

    // Check if data must be retreived
    mustFetchData = !this.props.data && (!this.state.data || !this.isAllEqual(this.props, prevProps, ['dataUrl', 'method', 'headers', 'body']));
    if(!this.props.data && prevProps?.data) mustFetchData = true;

    if(!mustAuthenticate && !mustFetchData && !mustRerender) {
      this.debug('No actions needed, returning early');
      return;
    }

    this.debug('Required actions:');
    this.debug('Must autheticate: ', mustAuthenticate);
    this.debug('Must mustFetchData: ', mustFetchData);
    this.debug('Must mustRerender: ', mustRerender);

    /*
      Run all actions
    */
    try {
      // Clear the errors
      this.setState({ error: undefined })

      // Retreive the template body
      const templateBody = await this.getTemplateBody(this.props);

      // Parse the template as a HTML element, do this early
      const templateElement = this.parseTemplateToHTMLElement(templateBody);
      
      // Retreive the x-template text from element
      const xTemplate = this.retreiveXTemplateFromHTML(templateElement);

      // Retreive loading element
      const loadingTemplateBody = this.parseXLoading(templateElement);
      if(this.state.loadingTemplateBody !== loadingTemplateBody) {
        this.setState({ loadingTemplateBody: loadingTemplateBody, loadingMessage: '' })
      }

      // Authenticate the request
      if(mustAuthenticate) authHeaders = await this.authenticate(this.props);
      
      // Retreive or parse data
      let data = this.state.data;
      if(this.props.data) data = JSON.parse(this.props.data)
      else if(mustFetchData) data = await this.fetchData(this.props, authHeaders)
      
      // Sanitize data
      if(data) data = sanitizeObject(data, { sanitizedText: '[Unsafe, removed]' })

      // Render
      let html = this.state.html;
      if(mustRerender) {
        console.log('Rerendering');
        // Register x-head script elements
        this.registerXHeadScripts(templateElement);

        // Run any x-inject code
        this.runXInjectCode(templateElement);

        html = mustRerender ? this.renderTemplate(xTemplate, data) : this.state.html;
      }

      // Update the state
      this.setState({
        data,
        html,
        isLoading: false
      })
    } catch (err) {
      console.error('An error has occured', err)
      this.setState({
        isLoading: false,
        error: err?.message || 'An unknown error has occured' 
      })
    }
  }

  private async getTemplateBody(props : ITemplateWebpartProps) {
    // If the template is in an url
    let templateString = props.templateString;
    if(props.templateUrl) {
      try {
        this.debug(`Downloading template from ${props.templateUrl}`)

        this.setState({ isLoading: true, loadingMessage: 'Downloading template' })
        const { data } = await axios.get(props.templateUrl);
        this.debug('Template download response', data)
        templateString = data;
      } catch (err) {
        this.debug(`Error downloading template from url ${props.templateUrl}`, props.templateUrl);
      }
    }

    if(!templateString) throw new Error('Unable to find a valid template');
    this.setState({ isLoading: false, loadingMessage: '' })
    return templateString;
  }

  private parseTemplateToHTMLElement(templateString: string) {
    const element = document.createElement('html')
    element.innerHTML = templateString;
    return element;
  }

  private retreiveXTemplateFromHTML(templateElement : HTMLElement) : string {
    this.debug('Retreiving x-template')
    let elements = templateElement.querySelectorAll("[type='x-template']");

    if(!elements || elements.length === 0) throw new Error('Could not find any x-template elements in the template');
    if(!elements[0].innerHTML) throw new Error('x-template cannot be empty');
    this.debug(`Found ${elements.length} elements`, elements)

    return elements[0].innerHTML;
  }

  private parseXLoading(templateElement : HTMLElement) : string {
    // Register elements
    this.debug('Retreiving x-loading')
    let loadingElement = '';
    const elements = templateElement.querySelectorAll("[type='x-loading']");
    let debugMessage = `Found ${elements.length} elements`;
    if(elements.length > 0) debugMessage += ', only the first will be used';
    this.debug(debugMessage, elements)
    
    if(elements.length > 0) {
      if(!elements[0].innerHTML) {
        this.debug('The loading element is skipped because it is empty');
      } else {
        loadingElement = elements[0].innerHTML;
      }
    }

    return loadingElement;
  }

  private registerXHeadScripts(templateElement : HTMLElement) : void {
    // Remove any already loaded x-head scripts
    document.head.querySelectorAll(`[id^="x-head-${this.state.id}"]`).forEach((i) => i.remove());

    // Register elements
    this.debug('Retreiving x-head')
    const elements = templateElement.querySelectorAll("[type='x-head']");
    this.debug(`Found ${elements.length} elements`, elements)
    for (let i = 0; i < elements.length; i++) {
      // Find all script elements 
      const scripts = elements[i].getElementsByTagName('script');

      for (let y = 0; y < scripts.length; y++) {
        // Create a new script element, it will not run if just appending the parsed scripts
        const script = document.createElement("script");
        script.type = 'text/javascript'
        script.async = true;
        script.innerHTML = scripts[y].innerHTML;
        script.id = `x-head-${this.state.id}`
        // Append it to the head
        document.head.appendChild(script);
      }
    }
  }

  /**
   * Retreives all x-inject elements in the template and runs them
   */
  private runXInjectCode(templateElement : HTMLElement) : void {
    // Handlebars must be made available here so that the eval-scripts has access to it
    /* eslint-disable-next-line */
    const Handlebars = handlebars;
    /*
      Run all injection scripts
    */
    this.debug('Retreiving x-inject elements')
    const elements = templateElement.querySelectorAll("[type='x-inject']");
    this.debug(`Found ${elements.length} elements`, elements)
    for (let i = 0; i < elements.length; i++) {
      // Find all script elements 
      const scripts = elements[i].getElementsByTagName('script');
    
      for (let y = 0; y < scripts.length; y++) {
        if(!scripts[y]?.innerHTML) continue;
        // Execute the code
        eval(scripts[y].innerHTML)
      }
    }
  }

  private renderTemplate(templateString : string, data : object) {
    const templateGenerator = handlebars.compile(templateString)
    return templateGenerator(data)
  }

  private async authenticate(props : ITemplateWebpartProps) {
    this.debug('Authenticating');
    this.setState({
      isAuthenticating: true
    })

    // Variables
    let authHeaders : any = {};
    let loginResponse = undefined;
    let expiresAtISO : String = new Date(new Date().setTime(new Date().getTime() + 1 * 60 * 60 * 1000)).toISOString();

    // Auth handlers
    if( props.type === 'basic') {
      authHeaders.Authorization = 'Basic ' + btoa(props.username + ':' + props.password);
    }
    else if(props.type === 'msgraph') {
      this.debug('Retreiving MSGraph token');
      const tokenProvider = await props.webpartContext.aadTokenProviderFactory.getTokenProvider();
      const token = await tokenProvider.getToken('https://graph.microsoft.com/');
      if(!token) throw new Error('Could not retreive a Graph token from SharePoint context')
      this.debug('Received token', token)

      authHeaders.Authorization = `Bearer ${token}`
    }
    else if(props.type === 'msapp') {
      this.debug('Authenticating using Microsoft Azure App Registration');
      const client = new msal.PublicClientApplication({
        auth: {
          clientId: props.msappClientId,
          authority: props.msappAuthorityUrl,
        },
      })
  
      const scopes = props.msappScopes.split('\n');
  
      this.debug('Authenticating');
      this.debug('ClientID', props.msappClientId);
      this.debug('Authority URL', props.msappAuthorityUrl);
      this.debug('Scopes', scopes);
      
      // Attempt to retreive the active account
      let activeAccount = client.getActiveAccount();
      if(!activeAccount) {
        const allAccounts = client.getAllAccounts();
        if(allAccounts && allAccounts.length > 0) activeAccount = allAccounts[0];
      }
  
      // If an active account has been found we can attempt to silently connect
      if(activeAccount) {
        const silentRequest : msal.SilentRequest = {
          scopes: scopes,
          account: activeAccount,
          
        }
        try {
          loginResponse = await client.acquireTokenSilent(silentRequest)
          console.log('Silent response', loginResponse);
          authHeaders.Authorization = `Bearer ${loginResponse.accessToken}`
        } catch {}
      }
      
      // Popup login
      if(!authHeaders) {
        // Attempt to figure out a login hint from webpartContext
        let loginHint = '';
        if(props.webpartContext) {
          loginHint = props.webpartContext.pageContext.user.loginName || props.webpartContext.pageContext.user.email;
        }
        console.log('LoginHint', loginHint)
    
        const loginRequest : msal.PopupRequest = {
          scopes: scopes,
        }
        if(loginHint) loginRequest.loginHint = loginHint;
        loginResponse = await client.acquireTokenPopup(loginRequest)
    
        // Validate the response
        if(!loginResponse) throw new Error('Login request did not give a response');
        if(!loginResponse.accessToken) throw new Error('Login request did not respond with a AccessToken');

        this.debug('Login popup response', loginResponse)
        authHeaders.Authorization = `Bearer ${loginResponse.accessToken}`
      }

      // Attempt to figure out when the token expires
      try {
        expiresAtISO = loginResponse.expiresOn.toISOString();
      } catch {}
    }

    if(!authHeaders) throw new Error('Could not get any authentication headers')
    this.debug('Auth headers', authHeaders)
    this.debug('Auth expires at: ' + expiresAtISO)

    this.setState({
      isAuthenticating: false,
      authExpirationISO: expiresAtISO,
      authHeaders: authHeaders
    })
    return authHeaders;
  }

  private async fetchData(options : ITemplateWebpartProps, authHeaders : Object) {
    const request : AxiosRequestConfig = {
      url: options.dataUrl,
      method: options.method,
      data: options.body
    }

    let headers = {};
    if(this.props.headers) {
      const lines = this.props.headers.split('\n');
      for(const line of lines) {
        if(line.indexOf('=') <= 0) continue;
        const parts = line.split(/=(.*)/);
        if(parts.length < 2) throw new Error(`Invalid header ${line}`)
        headers[parts[0].trim()] = parts[1].trim()
      }
    }

    if(authHeaders) {
      if(typeof authHeaders !== 'object') throw new Error(`Authentication header is invalid\n${authHeaders}`);
      headers = {
        ...headers,
        ...authHeaders
      }
    }

    if(Object.keys(headers).length > 0) request.headers = headers;

    this.debug('Fetching data from: ' + options.dataUrl)
    this.debug('Request', request)
    this.setState({ isLoading: true })
    const { data } = await axios.request(request);
    this.debug('Received data', data);
    return data;
  }

  /*
    Rendering
  */
  private allErrors() {
    const errors = [...this.state.propErrors];
    if(this.state.error && this.state.error !== {}) errors.push(this.state.error);

    return errors;
  }

  private baseStyle() : React.CSSProperties {
    const style : React.CSSProperties = {};
    if(this.props.minHeight) style.minHeight = this.props.minHeight;
    if(this.props.maxHeight) {
      style.maxHeight = this.props.maxHeight;
      style.overflow = 'auto';
    }
    return style;
  }

  public render(): React.ReactElement<ITemplateWebpartProps> {
    if(this.allErrors().length > 0 && !this.props.mockLoading) {
      return (
        <div className={styles.error} style={this.baseStyle()}>
          <h2>Feil har oppstått ({this.allErrors().length})</h2>
          <ul>
            {
              this.allErrors().map((i, index) => {
                return(
                  <li key={index}>
                    <b>{ i || 'Ukjent feil, se logg' }</b>
                  </li>
                )
              })
            }
          </ul>
        </div>
      )
    }

    if(this.state.isLoading || this.props.mockLoading) {

      let message = this.state.loadingMessage || 'Loading'

      if(this.state.loadingTemplateBody) {
        return (
          <div style={this.baseStyle()} dangerouslySetInnerHTML={{__html: this.state.loadingTemplateBody || ''}}>
          </div>
        )
      } else {
        return (
          <div className={styles.loading} style={this.baseStyle()}>
            { this.props.loadingType === 'spinner' && <Spinner size={SpinnerSize.large} />}
            { this.props.loadingType === 'skeleton' && <Shimmer height="200px" width="100%" style={{width: '100%'}} />}
            { message }
          </div>
        )
      }
    }

    return (
      <section className={`${styles.templateWebpart}`} style={this.baseStyle()}>
        <div>
          <div dangerouslySetInnerHTML={{__html: this.state.html || ''}} />
        </div>
      </section>
    );
  }
}
