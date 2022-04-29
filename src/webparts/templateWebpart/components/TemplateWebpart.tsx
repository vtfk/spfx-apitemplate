import * as React from 'react';
import styles from './TemplateWebpart.module.scss';
import { ITemplateWebpartProps } from './ITemplateWebpartProps';
import { isEqual, sortBy, times } from 'lodash'
import Sjablong from 'sjablong'
import handlebars from 'handlebars';
import template from './Template.js'
import { nanoid } from 'nanoid';
import axios, { AxiosRequestConfig } from 'axios';
import { Shimmer, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import * as msal from '@azure/msal-browser'

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
    html: ''
  }

  /*
    LifeCycle hooks
  */
  // Runs only when the component first loads
  public componentDidMount = async () => {
    this.debug('=== Webpart Mounted ===');
    this.debug('Props', this.props)

    const element = document.createElement('div')
    element.innerHTML = template;
    console.log('Element', element)

    await this.runActions(undefined, undefined);
  }

  // Runs data for the components updates and triggers a re-render
  public componentDidUpdate = async (prevProps : ITemplateWebpartProps, prevState : ITemplateWebpartState) => {
    this.debug('=== Webpart Updated ===');
    // this.debug('PrevProps', prevProps)
    // this.debug('Props', this.props)
    // this.debug('State', this.state)

    await this.runActions(prevProps, prevState);
  }

  /*
    Functions
  */
  private debug(...args : any[]) {
    if(!this.props?.debug) return;
    console.log(...args)
  }

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

  private async validateProps (props : ITemplateWebpartProps) {
    const errors = [];

    if(!this.props.type) errors.push('type must be provided');
    if(!this.props.method) errors.push('method must be provided');
    if(this.props.type === 'basic') {
      if(!this.props.username) errors.push('username must be provided when authentication basic is used');
      if(!this.props.password) errors.push('password must be provided when authentication basic is used');
    } else if (this.props.type === 'msapp') {
      if(!this.props.msappClientId) errors.push('msappClientId must be provided when authentication msapp is used');
      if(!this.props.msappAuthorityUrl) errors.push('msappAuthorityUrl must be provided when authentication msapp is used');
      if(!this.props.msappScopes) errors.push('msappScopes must be provided when authentication msapp is used');
      // if(!urlRegex.test(this.props.msappAuthorityUrl)) errors.push('msappAuthorityUrl is not in a valid url format');
    }
    if(!this.props.dataUrl) errors.push('dataUrl must be provided');
    // if(this.props.dataUrl && !urlRegex.test(this.props.dataUrl)) errors.push('dataUrl is not in a valid url format');
    if(!this.props.templateUrl && !this.props.templateString) errors.push('templateUrl or templateString must be provided');
    // if(this.props.templateUrl && !urlRegex.test(this.props.templateUrl)) errors.push('templateUrl is not in a valid url format');

    return errors;
  }

  private async runActions(prevProps : ITemplateWebpartProps, prevState : ITemplateWebpartState) {
    /*
      If there are errors, just return
    */
    // if(this.state.error) return;
    if(this.state.isLoading || this.props.mockLoading) return;

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

    // If the errors are not the same, update the store
    if(!isEqual(sortedErrors, previousErrors)) {
      this.setState({
        propErrors
      })
      return;
    }
    // If there are prop errors there is no need to continue
    if(propErrors.length > 0) return;

    /*
      Determine what actions must be done
    */
    // Check if it is time to authenticate again
    let mustAuthenticate = false;
    if(this.props.type === 'basic') mustAuthenticate = !this.isAllEqual(this.props, prevProps, ['type', 'username', 'password']);
    else if(this.props.type === 'oauth') {
      mustAuthenticate = !this.isAllEqual(this.props, prevProps, ['type', 'msappClientId', 'msappAuthorityUrl', 'msappScopes', 'headers']);
      // TODO: Make expiration check
    } else if(this.props.type === 'msgraph') mustAuthenticate = true;

    // Check if data must be retreived
    let mustFetchData = !this.props.data && (!this.isAllEqual(this.props, prevProps, ['dataUrl', 'method', 'headers', 'body']) || this.state.data === undefined);
    if(!this.props.data && prevProps?.data) mustFetchData = true;

    // Check if rerender is required
    // const mustRerender = !this.isAllEqual(this.props, prevProps, ['templateUrl', 'templateString', 'minHeight', 'maxHeight', 'mockLoading', 'mockAuthenticating']) || mustAuthenticate || mustFetchData
    const mustRerender = true;

    if(isEqual(prevProps, this.props)) {
      this.debug('The current and previous props are identical, no actions needed');
      return;
    }

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
      let authHeaders = undefined;
      if(mustAuthenticate) {
        authHeaders = await this.authenticate(this.props);
      }
      
      // Retreive or parse data
      let data = this.state.data;
      if(mustFetchData) data = mustFetchData ? await this.fetchData(this.props, authHeaders) : this.state.data;
      else if(this.props.data) {
        data = JSON.parse(this.props.data)
      }
      
      let html = this.state.html;
      if(mustRerender) {
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
        isLoading: false,
      })
    } catch (err) {
      console.error('An error has occured', err)
      this.setState({
        isLoading: false,
        error: err.message
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

  private runXInjectCode(templateElement : HTMLElement) : void {
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
    return templateGenerator({ dsData: data })
  }

  private async authenticate(props : ITemplateWebpartProps) {
    this.debug('Authenticating');
    this.setState({
      isAuthenticating: true
    })

    let authHeaders = undefined;
    if(this.props.type === 'msgraph') {
      this.debug('Retreiving MSGraph token');
      const tokenProvider = await this.props.webpartContext.aadTokenProviderFactory.getTokenProvider();
      const token = await tokenProvider.getToken('https://graph.microsoft.com/');
      if(!token) throw new Error('Could not retreive a Graph token from SharePoint context')

      authHeaders = {
        Authorization: `Bearer ${token}`
      }
    }
    else if(this.props.type === 'oauth') {
      const client = new msal.PublicClientApplication({
        auth: {
          clientId: this.props.msappClientId,
          authority: this.props.msappAuthorityUrl,
        },
      })
  
      const scopes = this.props.msappScopes.split('\n');
  
      this.debug('Authenticating');
      this.debug('ClientID', this.props.msappClientId);
      this.debug('Authority URL', this.props.msappAuthorityUrl);
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
        const loginResponse = await client.acquireTokenSilent(silentRequest)
        console.log('Silent response', loginResponse);
        authHeaders = {
          'Authorization': `Bearer ${loginResponse.accessToken}`
        }
      }
      
      // Popup login
      if(!authHeaders) {
        // Attempt to figure out a login hint from webpartContext
        let loginHint = '';
        if(this.props.webpartContext) {
          loginHint = this.props.webpartContext.pageContext.user.loginName || this.props.webpartContext.pageContext.user.email;
        }
        console.log('LoginHint', loginHint)
    
        const loginRequest : msal.PopupRequest = {
          scopes: scopes,
        }
        if(loginHint) loginRequest.loginHint = loginHint;
        const loginResponse = await client.acquireTokenPopup(loginRequest)
    
        // Validate the response
        if(!loginResponse) throw new Error('Login request did not give a response');
        if(!loginResponse.accessToken) throw new Error('Login request did not respond with a AccessToken');

        this.debug('Login popup response', loginResponse)
        authHeaders = {
          'Authorization': `Bearer ${loginResponse.accessToken}`
        }
      }
    }

    if(!authHeaders) throw new Error('Could not get any authentication headers')
    this.debug('Auth headers', authHeaders)

    this.setState({
      isAuthenticating: false
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
