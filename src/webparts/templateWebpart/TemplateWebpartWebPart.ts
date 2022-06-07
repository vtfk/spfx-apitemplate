import * as React from 'react';
import * as ReactDom from 'react-dom';
import {
  IPropertyPaneConfiguration,
  IPropertyPaneGroup,
  PropertyPaneDropdown,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import TemplateWebpart from './components/TemplateWebpart';
import { ITemplateWebpartProps } from './components/ITemplateWebpartProps';
import Handlebars from 'handlebars';
import handlebarHelpers from '../../lib/handlebar-helpers'

export default class TemplateWebpartWebPart extends BaseClientSideWebPart<ITemplateWebpartProps> {

  protected onInit(): Promise<void> {
    // Register Handlebars helpers
    Handlebars.registerHelper(handlebarHelpers)

    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<ITemplateWebpartProps> = React.createElement(
      TemplateWebpart,
      {...this.properties, webpartContext: this.context}
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    /*
      Choices
    */
    const types = [
      {
        key: 'anonymous',
        text: 'Anonymous'
      },
      {
        key: 'basic',
        text: 'Basic'
      },
      {
        key: 'msgraph',
        text: 'Microsoft Graph'
      },
      {
        key: 'msapp',
        text: 'Microsoft App Registration'
      }
    ]

    const httpMethods = [
      {
        key: 'get',
        text: 'GET'
      },
      {
        key: 'post',
        text: 'POST'
      },
      {
        key: 'put',
        text: 'PUT'
      },
      {
        key: 'patch',
        text: 'PATCH'
      },
      {
        key: 'delete',
        text: 'DELETE'
      },
      {
        key: 'options',
        text: 'OPTIONS'
      }
    ]

    const loadingTypes = [
      {
        key: 'spinner',
        text: 'Spinner'
      },
      {
        key: 'skeleton',
        text: 'Skeleton'
      }
    ]

    /*
      Groups
    */
    let groups : IPropertyPaneGroup[] = [
      {
        groupName: 'API',
        groupFields: [
          PropertyPaneDropdown('type', { 
            label: 'Type',
            options: types,
            selectedKey: 'anonymous'
          }),
          PropertyPaneTextField('dataUrl', {
            label: 'Data URL',
            description: 'The URL for retreiving the data'
          }),
          PropertyPaneDropdown('method', { 
            label: 'Method',
            options: httpMethods,
            selectedKey: 'get'
          }),
          PropertyPaneTextField('headers', {
            label: 'Headers',
            rows: 5,
            multiline: true,
            resizable: true,
            description: 'HTTP headers in [HeaderKey]=[HeaderValue] format'
          }),
          PropertyPaneTextField('body', {
            label: 'Body',
            rows: 5,
            multiline: true,
            resizable: true,
            description: 'Request body'
          })
        ]
      },
      {
        groupName: 'Data',
        isCollapsed: true,
        groupFields: [
          PropertyPaneTextField('data', {
            label: 'Data',
            rows: 5,
            multiline: true,
            resizable: true,
            description: 'If provided the webpart will use this data instead of contacting the API',
          })
        ]
      },
      {
        groupName: 'Template',
        isCollapsed: true,
        groupFields: [
          PropertyPaneTextField('templateUrl', {
            label: 'Template URL',
            description: 'If you have the template stored on an URL, use this option',
          }),
          PropertyPaneTextField('templateString', {
            label: 'Template String',
            rows: 5,
            multiline: true,
            resizable: true,
            description: 'If you want to store the template in the webpart, paste it here',
          })
        ]
      },
      {
        groupName: 'Visual',
        isCollapsed: true,
        groupFields: [
          PropertyPaneDropdown('loadingType', { 
            label: 'Loading indicator',
            options: loadingTypes,
            selectedKey: 'get'
          }),
          PropertyPaneTextField('minHeight', {
            label: 'Minumum height',
            description: 'The minimum height of the webpart'
          }),
          PropertyPaneTextField('maxHeight', {
            label: 'Maximum height',
            description: 'The maximum height of the webpartr'
          })
        ]
      },
      {
        groupName: 'Advanced',
        isCollapsed: true,
        groupFields: [
          PropertyPaneToggle('debug', {
            label: 'Debug',
          }),
          PropertyPaneToggle('mockLoading', {
            label: 'Loading',
          })
        ]
      }
    ]

    /*
      Conditional groups
    */
    if(this.properties.type) {
      if(this.properties.type === 'basic') {
        groups.splice(1, 0, {
          groupName: 'Authentication',
          groupFields: [
            PropertyPaneTextField('username', {label: 'Username'}),
            PropertyPaneTextField('password', {label: 'Password'})
          ]
        })
      } else if (this.properties.type === 'msapp') {
        groups.splice(1, 0, {
          groupName: 'Authentication',
          groupFields: [
            PropertyPaneTextField('msappClientId', { label: 'ClientID', description: 'The app client/application id' }),
            PropertyPaneTextField('msappAuthorityUrl', { label: 'Authority URL', description: 'The URL for requesting the bearer token' }),
            PropertyPaneTextField('msappScopes', {
              label: 'Scopes',
              rows: 5,
              multiline: true,
              resizable: true,
              description: 'One scope per line',
            })
          ]
        })
      }
    }

    return {
      pages: [
        {
          header: {
            description: 'Data HTML template webpart'
          },
          displayGroupsAsAccordion: true,
          groups
        }
      ]
    };
  }
}
