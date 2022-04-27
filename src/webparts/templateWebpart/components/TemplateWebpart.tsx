import * as React from 'react';
import styles from './TemplateWebpart.module.scss';
import { ITemplateWebpartProps } from './ITemplateWebpartProps';
import { isEqual, sortBy } from 'lodash'
import Sjablong from 'sjablong'
import handlebars from 'handlebars';
import mockData from './Data.js'
import template from './Template.js'

export interface ITemplateWebpartState {
  errors: any[];
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
    errors: [],
    data: {},
    html: ''
  }

  /*
    LifeCycle hooks
  */
  // Runs only when the component first loads
  componentDidMount = () => {
    this.debug('=== Webpart Mounted ===');
    this.debug('Props', this.props)

    const element = document.createElement('div')
    element.innerHTML = template;
    console.log('Element', element)

    this.validateProps(undefined, undefined)
  }

  // Runs data for the components updates and triggers a re-render
  componentDidUpdate = (prevProps, prevState) => {
    this.debug('=== Webpart Updated ===');
    this.debug('Props', this.props)
    this.debug('State', this.state)
    this.validateProps(prevProps, prevState)
  }

  /*
    Functions
  */
  debug(...args) {
    if(!this.props?.debug) return;
    console.log(...args)
  }

  private validateProps (prevProps, prevState) {
    /*
      Setup
    */
    // The handlebars import must be set as a variable here to make sure webpack don't renames it
    // The reason for this is that injection scripts with handlebar-helpers would not know what the name is
    const Handlebars = handlebars;  

    /*
      Validate that the props are ok
    */
    const _errors = [];
    if(!this.props.type) _errors.push('type must be provided');
    if(!this.props.method) _errors.push('method must be provided');
    if(this.props.type === 'basic') {
      if(!this.props.username) _errors.push('username must be provided when authentication basic is used');
      if(!this.props.password) _errors.push('password must be provided when authentication basic is used');
    } else if (this.props.type === 'oauth') {
      if(!this.props.oauthClientId) _errors.push('oauthClientId must be provided when authentication oauth is used');
      if(!this.props.oauthAuthorityUrl) _errors.push('oauthAuthorityUrl must be provided when authentication oauth is used');
      if(!this.props.oauthScopes) _errors.push('oauthScopes must be provided when authentication oauth is used');
    }
    if(!this.props.dataUrl) _errors.push('dataUrl must be provided');
    // if(this.props.dataUrl && !urlRegex.test(this.props.dataUrl)) _errors.push('dataUrl is not in a valid url format');
    if(!this.props.templateUrl && !this.props.templateString) _errors.push('templateUrl or templateString must be provided');
    
    if(this.props.templateUrl && !urlRegex.test(this.props.templateUrl)) _errors.push('templateUrl is not in a valid url format');
    if(this.props.errorTemplateUrl && !urlRegex.test(this.props.errorTemplateUrl)) _errors.push('errorTemplateUrl is not in a valid url format');
    if(this.props.loadingTemplateUrl && !urlRegex.test(this.props.loadingTemplateUrl)) _errors.push('loadingTemplateUrl is not in a valid url format');

    let previousErrors : String[] = prevState?.errors || [];
    const sortedErrors = sortBy(_errors, (i) => i)
    previousErrors = sortBy(previousErrors, (i) => i)

    // Protects against inifite loop
    if(!isEqual(sortedErrors, previousErrors)) {
      return this.setState({errors: _errors});
    }
    if(_errors.length > 0) return;

    /*
      Determine what template to use
    */
    // TODO: Add support for templateUrl
    const fullTemplate = this.props.templateString;
    let bodyTemplateString = '';

    if(_errors.length > 0) return this.setState({errors: _errors});
    /*
      Load the template into a HTML element
    */
    const element = document.createElement('div')
    try {
      element.innerHTML = fullTemplate;
    } catch (err) {
      _errors.push('Could not parse template into HTML element: ' + err.message)
    }

    if(_errors.length > 0) return this.setState({errors: _errors});
    /*
      Load the template
    */
    try {
      this.debug('Retreiving x-template')
      let elements = element.querySelectorAll("[type='x-template']");
      if(!elements || elements.length === 0) throw new Error('Could not find any x-template elements in the template');
      if(!elements[0].innerHTML) throw new Error('x-template cannot be empty');
      this.debug(`Found ${elements.length} elements`, elements)
      bodyTemplateString = elements[0].innerHTML;
    } catch (err) {
      _errors.push(`Error parsing template:'\n${err.message}`)
    }

    /*
      Parse and load all x-head scripts
    */
    try {
      this.debug('Retreiving x-head')
      const elements = element.querySelectorAll("[type='x-head']");
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
          script.id = `x-head-${Math.random().toString()}`
          // Append it to the head
          document.head.appendChild(script);
        }
      }
    } catch (err) {
      _errors.push(`Error parsing parsing x-head:'\n${err.message}`)
    }
    if(_errors.length > 0) return this.setState({errors: _errors});

    /*
      Run all injection scripts
    */
    try {
      this.debug('Retreiving x-inject')
      const elements = element.querySelectorAll("[type='x-inject']");
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
    } catch (err) {
      _errors.push(`Error parsing parsing x-inject:'\n${err.message}`)
    }

    if(_errors.length > 0) return this.setState({errors: _errors});
    /*
      Output handlebars helpers
    */
   this.debug('Handlebars helpers', Handlebars.helpers);

    /*
      Render the template
    */  
    if(!this.state.html) {
      // const html = Sjablong.replacePlaceholders(this.props.templateString, mockData)
      const templateGenerator = Handlebars.compile(bodyTemplateString)
      const html = templateGenerator({ dsData: mockData })
      this.setState({
        html
      })
    }
  }

  public render(): React.ReactElement<ITemplateWebpartProps> {
    const {
      templateUrl,
      templateString,
      debug
    } = this.props;

    if(this.state.errors.length > 0) {
      return (
        <div>
          Fant { this.state.errors.length } feil
          <ul>
            {
              this.state.errors.map((i, index) => {
                return(
                  <li key={index}>
                    { i || 'Ukjent feil' }
                  </li>
                )
              })
            }
          </ul>
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
