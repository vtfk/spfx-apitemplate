import * as React from 'react';
import styles from './TemplateWebpart.module.scss';
import { ITemplateWebpartProps } from './ITemplateWebpartProps';
import { isEqual, sortBy, times } from 'lodash'
import Sjablong from 'sjablong'
import handlebars from 'handlebars';
// import mockData from './Data.js'
import template from './Template.js'
import { nanoid } from 'nanoid';
import axios, { AxiosRequestConfig } from 'axios';
import ContentLoader, { Facebook } from 'react-content-loader'
import { Shimmer, Spinner, SpinnerSize } from 'office-ui-fabric-react';

export interface ITemplateWebpartState {
  id: string,
  isLoading: boolean,
  propErrors: string[]
  error: any,
  data: any;
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
  state = {
    id: nanoid(),
    isLoading: false,
    propErrors: [],
    error: undefined,
    data: undefined,
    html: ''
  }

  /*
    LifeCycle hooks
  */
  // Runs only when the component first loads
  componentDidMount = async () => {
    this.debug('=== Webpart Mounted ===');
    this.debug('Props', this.props)

    const element = document.createElement('div')
    element.innerHTML = template;
    console.log('Element', element)

    await this.runActions(undefined, undefined);
  }

  // Runs data for the components updates and triggers a re-render
  componentDidUpdate = async (prevProps : ITemplateWebpartProps, prevState : ITemplateWebpartState) => {
    this.debug('=== Webpart Updated ===');
    this.debug('PrevProps', prevProps)
    this.debug('Props', this.props)
    this.debug('State', this.state)

    await this.runActions(prevProps, prevState);
  }

  /*
    Functions
  */
  debug(...args : any[]) {
    if(!this.props?.debug) return;
    console.log(...args)
  }

  isAllEqual(obj1 : Object, obj2 : Object, properties: string[]) : Boolean {
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
    } else if (this.props.type === 'oauth') {
      if(!this.props.oauthClientId) errors.push('oauthClientId must be provided when authentication oauth is used');
      if(!this.props.oauthAuthorityUrl) errors.push('oauthAuthorityUrl must be provided when authentication oauth is used');
      if(!this.props.oauthScopes) errors.push('oauthScopes must be provided when authentication oauth is used');
    }
    if(!this.props.dataUrl) errors.push('dataUrl must be provided');
    // if(this.props.dataUrl && !urlRegex.test(this.props.dataUrl)) errors.push('dataUrl is not in a valid url format');
    if(!this.props.templateUrl && !this.props.templateString) errors.push('templateUrl or templateString must be provided');
    
    if(this.props.templateUrl && !urlRegex.test(this.props.templateUrl)) errors.push('templateUrl is not in a valid url format');
    if(this.props.errorTemplateUrl && !urlRegex.test(this.props.errorTemplateUrl)) errors.push('errorTemplateUrl is not in a valid url format');
    if(this.props.loadingTemplateUrl && !urlRegex.test(this.props.loadingTemplateUrl)) errors.push('loadingTemplateUrl is not in a valid url format');

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
    else if(this.props.type === 'oauth')  mustAuthenticate = !this.isAllEqual(this.props, prevProps, ['type', 'oauthClientId', 'oauthAuthorityUrl', 'oauthScopes']);
    
    // Check if data must be retreived
    const mustFetchData = !this.isAllEqual(this.props, prevProps, ['dataUrl', 'method', 'headers', 'body']) || this.state.data === undefined;

    // Check if rerender is required
    const mustRerender = !this.isAllEqual(this.props, prevProps, ['templateUrl', 'templateString', 'minHeight', 'maxHeight']) || mustAuthenticate || mustFetchData

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
      // Retreive the template body
      const templateBody = this.getTemplateBody(this.props);

      // TODO: Add authentication

      // Retreive data
      const data = mustFetchData ? await this.fetchData(this.props) : this.state.data;

      let html = this.state.html;
      if(mustRerender) {
        // Parse the template as a HTML element
        const templateElement = this.parseTemplateToHTMLElement(templateBody);

        // Retreive the x-template text from element
        const xTemplate = this.retreiveXTemplateFromHTML(templateElement);

        // Register x-head script elements
        this.registerXHeadScripts(templateElement);

        // Run any x-inject code
        this.runXInjectCode(templateElement);

        // Run the rerender
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
        error: err.message
      })
    }
  }

  private getTemplateBody(props : ITemplateWebpartProps) {
    // TODO: Add support for URL
    return props.templateString;
  }

  private parseTemplateToHTMLElement(template: string) {
    const element = document.createElement('html')
    element.innerHTML = template;
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

  private async fetchData(options : ITemplateWebpartProps) {
    const request : AxiosRequestConfig = {
      url: options.dataUrl,
      method: options.method,
      data: options.body
    }

    this.debug('Fetching data from: ' + options.dataUrl)
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
    const {
      templateUrl,
      templateString,
      debug
    } = this.props;

    if(this.allErrors().length > 0) {
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
      return (
        <div className={styles.loading} style={this.baseStyle()}>
          { this.props.loadingType === 'spinner' && <Spinner size={SpinnerSize.large} />}
          { this.props.loadingType === 'skeleton' && <Shimmer height="200px" width="100%" style={{width: '100%'}} />}
        </div>
      )
    }

    return (
      <section className={`${styles.templateWebpart}`}>
        <div>
          <div dangerouslySetInnerHTML={{__html: this.state.html || ''}} />
        </div>
      </section>
    );
  }
}
