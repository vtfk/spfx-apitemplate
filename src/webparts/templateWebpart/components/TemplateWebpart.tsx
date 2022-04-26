import * as React from 'react';
import styles from './TemplateWebpart.module.scss';
import { ITemplateWebpartProps } from './ITemplateWebpartProps';
import { escape } from '@microsoft/sp-lodash-subset';
import { isEqual, sortBy } from 'lodash'
import Sjablong from 'sjablong'

import mockData from './Data.js'
import template from './Template.js'

export interface ITemplateWebpartState {
  errors: any[];
  data: any;
  html: string;
}

const urlRegex = /((\w+:\/\/)[-a-zA-Z0-9:@;?&=\/%\+\.\*!'\(\),\$_\{\}\^~\[\]`#|]+)/g

export default class TemplateWebpart extends React.Component<ITemplateWebpartProps, ITemplateWebpartState> {
  public constructor(props: ITemplateWebpartProps) {
    super(props);
  }

  state = {
    errors: [],
    data: {},
    html: ''
  }

  componentDidMount = () => {
    console.log('Mounted');
    console.log('template', template);

    const element = document.createElement('div')
    element.innerHTML = template;
    console.log('Element', element)

    // Find all injection scripts
    const injects = element.querySelectorAll("[type='x-inject']");
    for (let i = 0; i < injects.length; i++) {
      // Find all script elements 
      const scripts = injects[i].getElementsByTagName('script');

      for (let y = 0; y < scripts.length; y++) {
        // Create a new script element, it will not run if just appending the parsed scripts
        const script = document.createElement("script");
        script.type = 'text/javascript'
        script.async = true;
        script.innerHTML = scripts[y].innerHTML;
        script.id = `template-${Math.random().toString()}`
        // Append it to the head
        document.head.appendChild(script);
      }
    }

    let x = 10;

    // Find all 
    const setups = element.querySelectorAll("[type='x-setup']");
    console.log('Setups', setups)
    for (let i = 0; i < setups.length; i++) {
      // Find all script elements 
      const scripts = setups[i].getElementsByTagName('script');

      for (let y = 0; y < scripts.length; y++) {
        if(!scripts[y]?.innerHTML) continue;

        // Execute the code
        eval(scripts[y].innerHTML)
      }
    }
    console.log(x)
    this.validateProps(undefined, undefined)
  }

  

  componentDidUpdate = (prevProps, prevState) => {
    console.log('Updated')
    this.validateProps(prevProps, prevState)
  }

  private validateProps (prevProps, prevState) {
    const _errors = [];
    console.log('Props', this.props)
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

    if(!isEqual(sortedErrors, previousErrors)) {
      console.log('The errors are not equal')
      this.setState({
        errors: _errors
      })
    }

    if(_errors.length > 0) return;
    
    if(!this.state.html) {
      const html = Sjablong.replacePlaceholders(this.props.templateString, mockData)
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
        { debug === true &&
          <div>
            DEBUG
          </div>
        }
        <div>
          <div dangerouslySetInnerHTML={{__html: this.state.html || ''}} />
        </div>
      </section>
    );
  }
}
