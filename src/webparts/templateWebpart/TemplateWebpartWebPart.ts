import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  IPropertyPaneGroup,
  PropertyPaneButton,
  PropertyPaneDropdown,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'TemplateWebpartWebPartStrings';
import TemplateWebpart from './components/TemplateWebpart';
import { ITemplateWebpartProps } from './components/ITemplateWebpartProps';

export default class TemplateWebpartWebPart extends BaseClientSideWebPart<ITemplateWebpartProps> {

  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  protected onInit(): Promise<void> {
    this._environmentMessage = this._getEnvironmentMessage();

    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<ITemplateWebpartProps> = React.createElement(
      TemplateWebpart,
      {...this.properties}
    );

    ReactDom.render(element, this.domElement);
  }

  private _getEnvironmentMessage(): string {
    if (!!this.context.sdks.microsoftTeams) { // running in Teams
      return this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
    }

    return this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment;
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;
    this.domElement.style.setProperty('--bodyText', semanticColors.bodyText);
    this.domElement.style.setProperty('--link', semanticColors.link);
    this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered);

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
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
        key: 'oauth',
        text: 'OAuth'
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

    /*
      Groups
    */
    let groups : IPropertyPaneGroup[] = [
      {
        groupName: 'Data',
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
          }),
          PropertyPaneButton('save', {
            text: 'Save',
            onClick: () => { console.log('Clicked') }
          }),
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
        groupName: 'Loading template',
        isCollapsed: true,
        groupFields: [
          PropertyPaneTextField('loadingTemplateUrl', {
            label: 'Template URL',
            description: 'Url of template to override loading'
          }),
          PropertyPaneTextField('loadingTemplateString', {
            label: 'Template String',
            rows: 5,
            multiline: true,
            resizable: true,
            description: 'Template text for overriding loading'
          })
        ]
      },
      {
        groupName: 'Error template',
        isCollapsed: true,
        groupFields: [
          PropertyPaneTextField('errorTemplateUrl', {
            label: 'Template URL',
            description: 'Url of template to override error'
          }),
          PropertyPaneTextField('errorTemplateString', {
            label: 'Template String',
            rows: 5,
            multiline: true,
            resizable: true,
            description: 'Template text for overriding error'
          })
        ]
      },
      {
        groupName: 'Advanced',
        isCollapsed: true,
        groupFields: [
          PropertyPaneToggle('debug', {
            label: 'Debug',
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
      } else if (this.properties.type === 'oauth') {
        groups.splice(1, 0, {
          groupName: 'Authentication',
          groupFields: [
            PropertyPaneTextField('oauthClientId', { label: 'ClientID', description: 'The OAuth client/application id' }),
            PropertyPaneTextField('oauthAuthorityUrl', { label: 'Authority URL', description: 'The URL for requesting the bearer token' }),
            PropertyPaneTextField('oauthScopes', {
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
