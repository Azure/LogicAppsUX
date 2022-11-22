/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IParametersFileContent, Parameter, ProjectResource } from '@microsoft-logic-apps/utils';
import { AzExtTreeItem, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { getThemedIconPath } from '../utils/tree/resources';
import { ParametersTreeItem } from './ParametersTreeItem';
import { getProjectContextValue } from './projectContextValues';

export class ParameterTreeItem extends AzExtTreeItem {
    public readonly parent: ParametersTreeItem;
    public readonly name: string;
    public readonly content: Parameter;

    private constructor(parent: ParametersTreeItem, name: string, content: Parameter) {
        super(parent);
        this.name = name;
        this.content = content;
        this.commandId = 'azureLogicAppsStandard.viewContent';
    }

    public get id(): string {
        return this.name;
    }

    public get label(): string {
        return this.name;
    }

    public get contextValue(): string {
        return getProjectContextValue(this.parent.parent.parent.source, this.parent.access, ProjectResource.Parameter);
    }

    public get iconPath(): TreeItemIconPath {
        return getThemedIconPath('Parameter');
    }

    public static async create(parent: ParametersTreeItem, fileContent: IParametersFileContent): Promise<ParameterTreeItem> {
        const { content, name } = fileContent;
        return new ParameterTreeItem(parent, name, content);
    }
}
