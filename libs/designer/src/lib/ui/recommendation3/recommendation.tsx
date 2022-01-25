/* eslint-disable formatjs/enforce-description */
/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: HEAVY REFACTOR
import { DirectionalHint, ICalloutProps } from '@fluentui/react/lib/Callout';
import {
  DocumentCard,
  DocumentCardLocation,
  DocumentCardPreview,
  IDocumentCard,
  IDocumentCardLocationProps,
  IDocumentCardProps,
} from '@fluentui/react/lib/DocumentCard';
import { Icon } from '@fluentui/react/lib/Icon';
import { ImageFit } from '@fluentui/react/lib/Image';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { PivotItem } from '@fluentui/react/lib/Pivot';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { findDOMNode } from 'react-dom';
import { MenuItemOption } from '../../ui/card/menu';
import Constants from '../constants';
import { ImageWithFallback } from '../imagewithfallback';
import DefaultIcon from '../recommendation/images/defaulticon.svg';
import { Tip, TipProps } from '../tip';
import ChooseActionIcon from './images/choose-an-action.svg';
import { Badge } from './badge';
import { Card } from './card';
import { Category, CategoryPivot } from './categorypivot';
import { Connectors } from './connectors';
import { DocumentationItem } from './documentationitem';
import { ErrorMessage } from './errormessage';
import { ExpandConnectorsButton } from './expandconnectorsbutton';
import { Modules } from './modules';
import { Operations } from './operations';
import { OperationKind } from './models';
import { SearchBox } from './searchbox';
import { Suggestions } from './suggestions';
import { isUserVoiceProps, UserVoice, UserVoiceProps } from './uservoice';
import { DocLinkClickedEventHandler } from '../recommendation';
import { getIntl } from '../../common/i18n/intl';
import { ITextField } from '@fluentui/react';
import { guid } from '@microsoft-logic-apps/utils';

export enum Categories {
  FORYOU = 'FOR_YOU',
  MODULES = 'MODULES',
}

export enum ShowMode {
  Both,
  Connectors,
  Operations,
}

export interface Connector {
  brandColor: string;
  icon: string;
  id: string;
  environmentBadge?: {
    name: string;
    description: string;
  };
  promotionIndex?: number;
  category?: string;
  title: string;
}

export interface DisableableConnector extends Connector {
  disabled: boolean;
}

export interface DisableableModule extends Module {
  disabled: boolean;
}

export interface DisableableOperation extends Operation {
  disabled: boolean;
}

export interface SuggestedItem {
  connector: Connector;
  operations: Operation[];
}

export interface Module {
  description: string;
  id: string;
  image: string;
  title: string;
}

export interface Operation {
  brandColor: string;
  connector?: string;
  connectorKind?: string;
  description: string;

  /**
   * @deprecated Use externalDocs instead.
   */
  documentation?: Swagger.ExternalDocumentation;

  environmentBadge?: {
    name: string;
    description: string;
  };
  externalDocs?: Swagger.ExternalDocumentation;
  icon: string;
  id: string;
  important?: boolean;
  operationType?: string;
  premium?: boolean;
  preview?: boolean;
  promotionIndex?: number;
  subtitle: string;
  title: string;
}

export interface RecommendationProps {
  brandColor?: string;
  categories?: Category[];
  canShowMoreOperations?: boolean;
  getComponentType?(options: Record<string, string>): React.ComponentClass;
  connectors?: Connector[];
  contextMenuOptions?: MenuItemOption[];
  disabled?: boolean;
  errorLevel?: MessageBarType;
  errorMessage?: string;
  extraOperations?: Operation[];
  failed?: boolean;
  filterText?: string;
  icon?: string;
  isLoading?: boolean;
  isPanelModeEnabled?: boolean;
  isTrigger?: boolean;
  modules?: Module[];
  neverCollapsed?: boolean;
  noConnectorsProps?: UserVoiceProps;
  openWindow?(url: string): Promise<boolean>;
  operationKinds?: OperationKind[];
  operations?: Operation[];
  placeholder?: string;
  selected: boolean;
  selectedConnector?: string;
  selectedCategory?: string;
  selectedKind?: string;
  showCategoryPivot?: boolean;
  showEnvironmentBadge?: boolean;
  showMode?: ShowMode;
  suggestedItems?: SuggestedItem[];
  showSuggestedItems?: boolean;
  tip?: TipProps;
  title?: string;
  userVoiceProps?: UserVoiceProps;
  hidePivotsOnSearch?: boolean;
  onBackClick?(): void;
  onCancelClick?(): void;
  onCategoryClick?(category: string): void;
  onClearListClick?(): void;
  onClick?(): void;
  onConnectorClick?(connector: string, telemetryIdentifier?: string): void;
  onExpandConnectorsClick?(): void;
  onKindClick?(kind: string): void;
  onModuleClick?(module: string): void;
  onOperationClick?(operation: string, telemetryIdentifier?: string): void;
  onRenderOperationDescription?(item: Operation): RenderOperationDescriptionResponse | undefined;
  onSearchBoxChange?(filterText: string): void;
  onSeeMoreOperationsClick?(): void;
  createDocLinkClickHandler?(connectorId: string, operationId: string): DocLinkClickedEventHandler;
  resultsRenderer?: React.ComponentType;
  renderCardViewHeader?: JSX.Element;
  onOperationContextualHelpClick?(operationId: string): void;
}

export interface RecommendationState {
  moduleCalloutProps: ICalloutProps;
  operationCalloutProps: ICalloutProps;
}

export interface RenderOperationDescriptionResponse {
  documentation?: Swagger.ExternalDocumentation;
}

const ModuleDimensions = {
  HEIGHT: 125,
  WIDTH: 175,
};
const intl = getIntl();
export class Recommendation extends React.Component<RecommendationProps, Partial<RecommendationState>> {
  private readonly _cardRef = React.createRef<any>(); // tslint:disable-line: no-any
  private readonly _recommendationPickerRef = React.createRef<RecommendationPicker>();

  static defaultProps: Partial<RecommendationProps> = {
    brandColor: Constants.DEFAULT_BRAND_COLOR,
    canShowMoreOperations: false,
    disabled: false,
    errorLevel: MessageBarType.error,
    extraOperations: [] as Operation[],
    failed: false,
    filterText: '',
    icon: ChooseActionIcon,
    isLoading: false,
    isPanelModeEnabled: false,
    isTrigger: false,
    neverCollapsed: false,
    noConnectorsProps: {
      headerText: '',
      iconProps: {
        className: 'msla-no-connectors-icon',
        iconName: 'Info',
      },
      segments: [
        {
          text: intl.formatMessage({
            defaultMessage: 'Want to create your own connectors?',
          }),
        },
        {
          href: Constants.RECOMMENDATION_CREATE_OPERATION_HELP_URL,
          text: intl.formatMessage({ defaultMessage: 'Learn more about creating connectors.' }),
        },
      ],
    },
    placeholder: '',
    selectedCategory: Categories.FORYOU,
    selectedKind: 'ACTIONS',
    showCategoryPivot: false,
    showSuggestedItems: true,
    title: intl.formatMessage({
      defaultMessage: 'Choose an operation',
    }),
  };

  focus(): void {
    if (this._recommendationPickerRef.current) {
      this._recommendationPickerRef.current.focus();
    } else if (this._cardRef.current) {
      this._cardRef.current.focus();
    }
  }

  render(): JSX.Element {
    const {
      brandColor,
      contextMenuOptions,
      icon,
      isPanelModeEnabled,
      isTrigger,
      neverCollapsed,
      selected,
      title,
      onCancelClick,
      renderCardViewHeader,
    } = this.props;

    const recommendationPicker = <RecommendationPicker ref={this._recommendationPickerRef} {...this.props} />;

    if (isPanelModeEnabled || neverCollapsed || !isTrigger) {
      return (
        <Card
          brandColor={brandColor}
          contextMenuOptions={contextMenuOptions}
          icon={icon ?? ''}
          isPanelModeEnabled={isPanelModeEnabled}
          rootRef={this._cardRef}
          selected={selected}
          title={title ?? ''}
          onCancelClick={onCancelClick}
          onClick={this._handleClick}
          renderCardViewHeader={renderCardViewHeader}
        >
          {recommendationPicker}
        </Card>
      );
    }

    return recommendationPicker;
  }

  private _handleClick = (): void => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  };
}

class RecommendationPicker extends React.Component<RecommendationProps, Partial<RecommendationState>> {
  private readonly _searchBox = React.createRef<ITextField>();
  private readonly _searchBoxId = guid();
  state: Readonly<Partial<RecommendationState>> = {};

  componentDidUpdate(prevProps: RecommendationProps): void {
    const { showMode: prevShowMode } = prevProps;
    const { showMode } = this.props;
    if (showMode !== prevShowMode) {
      this.focus();
    }
  }

  focus(): void {
    if (this._searchBox.current) {
      this._searchBox.current.focus();
    }
  }

  render(): JSX.Element {
    const {
      canShowMoreOperations,
      categories,
      getComponentType,
      connectors,
      disabled,
      errorLevel,
      errorMessage,
      extraOperations,
      failed,
      filterText,
      isLoading,
      isPanelModeEnabled,
      isTrigger,
      modules,
      placeholder,
      openWindow,
      operationKinds,
      operations,
      selectedConnector,
      selectedCategory,
      selectedKind,
      showCategoryPivot,
      showEnvironmentBadge,
      showMode,
      showSuggestedItems,
      suggestedItems,
      tip,
      userVoiceProps,
      hidePivotsOnSearch,
      resultsRenderer,
    } = this.props;
    const { moduleCalloutProps, operationCalloutProps } = this.state;
    const recommendationClassName = isTrigger ? 'msla-recommendation-v3 msla-triggers' : 'msla-recommendation-v3';

    if (getComponentType) {
      const CustomItems = getComponentType({ selectedCategory: selectedCategory ?? '' });
      const recommendationProps = {
        selectedCategory,
        selectedConnector,
        operationKind: selectedKind,
        operations,
        connectors,
        canShowMoreOperations,
        filterText,
        isLoading,
        userVoiceProps,
        onSeeMoreOperationsClick: this.props.onSeeMoreOperationsClick,
        onOperationClick: this.props.onOperationClick,
        onConnectorClick: this.props.onConnectorClick,
        onClearListClick: this.props.onClearListClick,
        onOperationHelpItemClick: this.props.onOperationContextualHelpClick,
      };

      if (CustomItems) {
        const hidePivots = filterText !== '' && hidePivotsOnSearch;
        return (
          <div className={recommendationClassName}>
            <ErrorMessage errorLevel={errorLevel} errorMessage={errorMessage} visible={!!failed} />
            {selectedCategory !== 'MY_CLIPBOARD' ? (
              <SearchBox
                id={this._searchBoxId}
                disabled={disabled}
                isLoading={!!isLoading}
                placeholder={placeholder ?? ''}
                componentRef={this._searchBox}
                showMode={showMode}
                value={filterText ?? ''}
                onBackClick={this._handleBackClick}
                onChange={this._handleSearchBoxChange}
                dataAutomationId="designer-search-box"
                isSearching={hidePivots}
              />
            ) : null}
            {!hidePivots && (
              <CategoryPivot
                categories={categories ?? []}
                disabled={disabled}
                selectedCategory={selectedCategory ?? ''}
                visible={showCategoryPivot && showMode !== ShowMode.Operations}
                onCategoryClick={this._handleCategoryClick}
              />
            )}
            {selectedCategory === 'MY_CLIPBOARD' ? <CustomItems /> : <CustomItems {...recommendationProps} />}
          </div>
        );
      }
    }
    const noConnectorsProps = {
      disabled,
      openWindow,
      ...this.props.noConnectorsProps,
    };

    if (selectedCategory === Categories.FORYOU) {
      const suggestionVisible = showMode !== ShowMode.Operations && !isTrigger && showSuggestedItems;
      return (
        <div className={recommendationClassName}>
          <ErrorMessage errorLevel={errorLevel} errorMessage={errorMessage} visible={!!failed} />
          <SearchBox
            id={this._searchBoxId}
            disabled={disabled}
            isLoading={!!isLoading}
            placeholder={placeholder ?? ''}
            componentRef={this._searchBox}
            showMode={showMode}
            value={filterText ?? ''}
            onBackClick={this._handleBackClick}
            onChange={this._handleSearchBoxChange}
            dataAutomationId="designer-search-box"
          />
          <CategoryPivot
            categories={categories ?? []}
            disabled={disabled}
            selectedCategory={selectedCategory}
            visible={showCategoryPivot && showMode !== ShowMode.Operations}
            onCategoryClick={this._handleCategoryClick}
          />
          <div className="msla-foryou-container">
            <Connectors
              connectors={connectors ?? []}
              disabled={disabled}
              filterText={filterText ?? ''}
              isLoading={!!isLoading}
              isTrigger={!!isTrigger}
              noConnectorsProps={noConnectorsProps as any}
              selectedCategory={selectedCategory}
              showMode={showMode ?? ShowMode.Both}
              visible={showMode !== ShowMode.Operations}
              onClearListClick={this._handleClearListClick}
              onRenderConnector={this._handleRenderMruConnector}
            />
            <Suggestions
              disabled={disabled}
              showEnvironmentBadge={showEnvironmentBadge}
              suggestedItems={suggestedItems}
              visible={suggestionVisible}
              onConnectorClick={this._handleSuggestedConnectorClick}
              onOperationClick={this._handleSuggestedOperationClick}
            />
          </div>
          <Operations
            canShowMoreOperations={!!canShowMoreOperations}
            disabled={disabled}
            extraOperations={extraOperations as any}
            filterText={filterText as any}
            isLoading={isLoading as any}
            isPanelModeEnabled={isPanelModeEnabled}
            operationCalloutProps={operationCalloutProps}
            operationKinds={operationKinds as any}
            operations={operations as any}
            selectedKind={selectedKind as any}
            showMode={showMode as any}
            userVoiceProps={userVoiceProps}
            visible={showMode === ShowMode.Operations}
            onKindClick={this._handleKindClick}
            onRenderOperation={this._handleRenderOperation}
            onSeeMoreOperationsClick={this._handleSeeMoreOperationsClick}
            resultsRenderer={resultsRenderer}
          />
          {tip ? <Tip {...tip} directionalHint={DirectionalHint.leftTopEdge} gapSpace={35} target={this._searchBoxId} /> : null}
        </div>
      );
    } else {
      return (
        <div className={recommendationClassName}>
          <ErrorMessage errorLevel={errorLevel} errorMessage={errorMessage} visible={!!failed} />
          <SearchBox
            id={this._searchBoxId}
            disabled={disabled}
            isLoading={!!isLoading}
            placeholder={placeholder as any}
            componentRef={this._searchBox}
            showMode={showMode}
            value={filterText as any}
            onBackClick={this._handleBackClick}
            onChange={this._handleSearchBoxChange}
            dataAutomationId="designer-search-box"
          />
          <CategoryPivot
            categories={categories as any}
            disabled={disabled}
            selectedCategory={selectedCategory as any}
            visible={showCategoryPivot && showMode !== ShowMode.Operations}
            onCategoryClick={this._handleCategoryClick}
          />
          <Connectors
            connectors={connectors as any}
            disabled={disabled}
            filterText={filterText as any}
            isLoading={!!isLoading}
            isTrigger={!!isTrigger}
            noConnectorsProps={noConnectorsProps as any}
            selectedCategory={selectedCategory as any}
            showMode={showMode as any}
            visible={selectedCategory !== Categories.MODULES && showMode !== ShowMode.Operations}
            onRenderConnector={this._handleRenderConnector}
          />
          <ExpandConnectorsButton
            disabled={disabled}
            visible={selectedCategory !== Categories.MODULES && showMode === ShowMode.Both}
            onExpandConnectorsClick={this._handleExpandConnectorsClick}
          />
          <Operations
            canShowMoreOperations={canShowMoreOperations as any}
            disabled={disabled}
            extraOperations={extraOperations as any}
            filterText={filterText as any}
            isLoading={isLoading as any}
            isPanelModeEnabled={isPanelModeEnabled}
            operationCalloutProps={operationCalloutProps}
            operationKinds={operationKinds as any}
            operations={operations as any}
            selectedKind={selectedKind as any}
            showMode={showMode as any}
            userVoiceProps={userVoiceProps}
            visible={selectedCategory !== Categories.MODULES && showMode !== ShowMode.Connectors}
            onKindClick={this._handleKindClick}
            onRenderOperation={this._handleRenderOperation}
            onSeeMoreOperationsClick={this._handleSeeMoreOperationsClick}
            resultsRenderer={resultsRenderer}
          />
          <Modules
            disabled={disabled}
            moduleCalloutProps={moduleCalloutProps}
            modules={modules as any}
            visible={selectedCategory === Categories.MODULES}
            onRenderModule={this._handleRenderModule}
          />
          {tip ? <Tip {...tip} directionalHint={DirectionalHint.leftTopEdge} gapSpace={35} target={this._searchBoxId} /> : null}
        </div>
      );
    }
  }

  private _handleBackClick = (): void => {
    const { onBackClick } = this.props;
    if (onBackClick) {
      onBackClick();
    }
  };

  private _handleCategoryClick = (item: PivotItem): void => {
    const { onCategoryClick } = this.props;
    if (onCategoryClick) {
      onCategoryClick(item.props.itemKey as any);
    }
  };

  private _handleClearListClick = (): void => {
    const { onClearListClick } = this.props;
    if (onClearListClick) {
      onClearListClick();
    }
  };

  private _handleSuggestedConnectorClick = (connectorId: string): void => {
    this._handleConnectorClick(connectorId, Constants.TELEMETRY_IDENTIFIERS.FOR_YOU_SUGGESTED_CONNECTOR_CLICK);
  };

  private _handleConnectorClick = (connector: string, telemetryIdentifier?: string): void => {
    const { onConnectorClick } = this.props;
    if (onConnectorClick) {
      onConnectorClick(connector, telemetryIdentifier);
    }
  };

  private _handleExpandConnectorsClick = (): void => {
    const { onExpandConnectorsClick } = this.props;
    if (onExpandConnectorsClick) {
      onExpandConnectorsClick();
    }
  };

  private _handleKindClick = (item: PivotItem): void => {
    const { onKindClick } = this.props;
    if (onKindClick) {
      onKindClick(item.props.itemKey as any);
    }
  };

  private _handleModuleClick = (module: string): void => {
    const { onModuleClick } = this.props;
    if (onModuleClick) {
      onModuleClick(module);
    }
  };

  private _handleModuleTitleClick = (e: React.MouseEvent<HTMLElement>, item: DisableableModule, target: HTMLElement) => {
    e.stopPropagation();

    const { description, id, title } = item;

    this.setState({
      moduleCalloutProps: {
        children: (
          <button className="msla-module-description-callout" onClick={this._handleModuleClick.bind(this, id)}>
            <header>{title}</header>
            <div>{description}</div>
          </button>
        ),
        coverTarget: true,
        directionalHint: DirectionalHint.topCenter,
        gapSpace: 0,
        isBeakVisible: false,
        setInitialFocus: true,
        target,
        onDismiss: () => {
          this.setState({
            moduleCalloutProps: undefined,
          });
        },
      },
    });
  };

  private _handleOperationClick = (operationId: string): void => {
    this._handleRecommendationOperationClick(operationId);
  };

  private _handleSuggestedOperationClick = (operationId: string): void => {
    this._handleRecommendationOperationClick(operationId, Constants.TELEMETRY_IDENTIFIERS.FOR_YOU_SUGGESTED_OPERATION_CLICK);
  };

  private _handleRecommendationOperationClick(operationId: string, telemetryIdentifier?: string): void {
    const { onOperationClick } = this.props;
    if (onOperationClick) {
      onOperationClick(operationId, telemetryIdentifier);
    }
  }

  private _handleOperationDescriptionClick = (e: React.MouseEvent<HTMLElement>, item: Operation, target: HTMLElement): void => {
    e.stopPropagation();

    const { connectorKind, title } = item;
    const connectorKindBadge = connectorKind ? <span className="msla-connector-kind">{connectorKind}</span> : null;

    this.setState({
      operationCalloutProps: {
        children: (
          <div className="msla-operation-description-callout" data-is-focusable={true} tabIndex={0}>
            <header>
              {title}
              {connectorKindBadge}
            </header>
            {this._renderDoc(item)}
          </div>
        ),
        directionalHint: DirectionalHint.rightCenter,
        setInitialFocus: true,
        target,
        onDismiss: () => {
          this.setState({
            operationCalloutProps: undefined,
          });
        },
      },
    });
  };

  private _handleRenderMruConnector = (item: DisableableConnector): JSX.Element => {
    return this._renderConnector(item, Constants.TELEMETRY_IDENTIFIERS.FOR_YOU_MRU_CONNECTOR_CLICK);
  };

  private _handleRenderConnector = (item: DisableableConnector): JSX.Element => {
    return this._renderConnector(item);
  };

  private _renderDoc(item: Operation): JSX.Element {
    let documentation: Swagger.ExternalDocumentation | undefined;
    const { createDocLinkClickHandler, openWindow, onRenderOperationDescription } = this.props;
    if (onRenderOperationDescription) {
      ({ documentation } = onRenderOperationDescription(item) as any);
    }

    const DOCUMENTATION_URLDESCRIPTION = intl.formatMessage({
      defaultMessage: 'Learn more',
    });
    if (documentation) {
      return (
        <DocumentationItem
          description={item.description}
          link={{ url: documentation.url, urlDescription: DOCUMENTATION_URLDESCRIPTION }}
          openWindow={openWindow}
          onClick={createDocLinkClickHandler && createDocLinkClickHandler(item.connector as any, item.id)}
        />
      );
    } else {
      return <DocumentationItem description={item.description} />;
    }
  }

  private _renderConnector(item: DisableableConnector, telemetryIdentifier?: string): JSX.Element {
    const { brandColor, disabled, environmentBadge, icon, id, title } = item;
    const style = {
      backgroundColor: brandColor || Constants.DEFAULT_BRAND_COLOR,
    };
    const showEnvironmentBadge = this.props.showEnvironmentBadge && !!environmentBadge;
    const badgeName = showEnvironmentBadge ? environmentBadge.name : undefined;
    const badgeDescription = showEnvironmentBadge ? environmentBadge.description : undefined;

    return (
      <button
        aria-labelledby={id}
        className="msla-connector"
        disabled={disabled}
        onClick={this._handleConnectorClick.bind(this, id, telemetryIdentifier)}
        title={title}
        data-automation-id={`connector-item-${id}`}
      >
        <ImageWithFallback alt="" className="msla-connector-icon" role="presentation" src={icon || DefaultIcon} style={style} />
        <div id={id} className="msla-connector-title">
          <div className="msla-connector-title-label">{title}</div>
          <Badge className="msla-ise" tag="div" text={badgeName as any} visible={!!showEnvironmentBadge} title={badgeDescription} />
        </div>
      </button>
    );
  }

  private _handleRenderModule = (item: DisableableModule): JSX.Element => {
    const { disabled, id, image, title } = item;
    const previewProps = {
      previewImages: [
        {
          height: ModuleDimensions.HEIGHT,
          name: title,
          imageFit: ImageFit.cover,
          previewImageSrc: image,
          width: ModuleDimensions.WIDTH,
        },
      ],
    };

    // TODO(joechung): Change this when Fabric DocumentCard components become disableable.
    const documentCardProps: Partial<IDocumentCardProps> = {
      ...(!disabled ? { onClick: this._handleModuleClick.bind(this, id) } : undefined),
    };

    // TODO(joechung): Change this when Fabric DocumentCardLocation components become disableable.
    let target: IDocumentCard;
    const documentCardLocationProps: Partial<IDocumentCardLocationProps> = {
      // eslint-disable-next-line react/no-find-dom-node
      ...(!disabled
        ? // eslint-disable-next-line react/no-find-dom-node
          { onClick: (e) => this._handleModuleTitleClick(e as any, item, findDOMNode(target as any) as HTMLElement) }
        : undefined), // tslint:disable-line: no-any
    };

    return (
      <DocumentCard componentRef={((card: IDocumentCard) => (target = card)) as any} {...documentCardProps}>
        <DocumentCardPreview {...previewProps} />
        <DocumentCardLocation location={title} {...documentCardLocationProps} />
      </DocumentCard>
    );
  };

  private _handleRenderOperation = (item: DisableableOperation | UserVoiceProps): JSX.Element => {
    return isUserVoiceProps(item) ? (
      <UserVoice openWindow={this.props.openWindow} {...item} />
    ) : (
      <ConnectionOperation
        {...item}
        showBadge={this.props.showEnvironmentBadge as any}
        onInfoClick={this._handleOperationDescriptionClick}
        onOperationClick={this._handleOperationClick}
      />
    );
  };

  private _handleSearchBoxChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newText: string): void => {
    const { onSearchBoxChange } = this.props;
    if (onSearchBoxChange) {
      onSearchBoxChange(newText);
    }
  };

  private _handleSeeMoreOperationsClick = (): void => {
    const { onSeeMoreOperationsClick } = this.props;
    if (onSeeMoreOperationsClick) {
      onSeeMoreOperationsClick();
    }
  };
}

interface ConnectionOperationProps extends DisableableOperation {
  showBadge: boolean;
  onInfoClick(e: React.MouseEvent<HTMLElement>, item: DisableableOperation, target: HTMLElement): void;
  onOperationClick(id: string): void;
}

function ConnectionOperation(props: ConnectionOperationProps): JSX.Element {
  function handleInfoClick(e: React.MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    onInfoClick(e, props, target.current as any);
  }

  function handleOperationClick(): void {
    onOperationClick(id);
  }

  const { brandColor, disabled, environmentBadge, icon, id, premium, preview, showBadge, subtitle, title, onInfoClick, onOperationClick } =
    props;
  const target = React.useRef<HTMLAnchorElement>();
  const anchorProps = {
    ...(!disabled ? { onClick: handleInfoClick } : { 'data-disabled': 'true' }),
  };
  const style: React.CSSProperties = {
    backgroundColor: brandColor,
  };
  const showEnvironmentBadge = showBadge && !!environmentBadge;
  const badgeName = showEnvironmentBadge ? environmentBadge.name : undefined;
  const badgeDescription = showEnvironmentBadge ? environmentBadge.description : undefined;
  const ariaLabel = intl.formatMessage({ defaultMessage: '{title}: More info' }, { title });

  return (
    <div className="msla-operation-flexbox" role="presentation">
      <button
        className="msla-operation"
        disabled={disabled}
        id={id}
        onClick={handleOperationClick}
        data-automation-id={`connector-operation-${id}`}
      >
        <ImageWithFallback alt="" className="msla-operation-icon" role="presentation" src={icon} style={style} />
        <div className="msla-operation-text">
          <div className="msla-operation-title">
            {title}
            <Badge text={intl.formatMessage({ defaultMessage: '(preview)' })} visible={!!preview} />
            <Badge className="msla-premium" text={intl.formatMessage({ defaultMessage: 'Premium' })} visible={!!premium} />
            <Badge className="msla-ise" tag="div" text={badgeName as any} title={badgeDescription} visible={showEnvironmentBadge} />
          </div>
          <div className="msla-operation-subtitle">{subtitle}</div>
        </div>
      </button>
      <div className="msla-operation-description" role="presentation">
        <TooltipHost content={ariaLabel}>
          <a
            aria-label={ariaLabel}
            className="msla-operation-description-button"
            role="button"
            ref={target as any}
            tabIndex={0}
            {...anchorProps}
          >
            <Icon aria-label="" iconName="Info" />
          </a>
        </TooltipHost>
      </div>
    </div>
  );
}
