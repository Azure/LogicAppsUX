# Fixed Daily Kusto Query Catalog

Execute every block against cluster `https://processus.kusto.windows.net`, database
`ClientTelemetry`, and table `VSCodeClient`.

The catalog keeps the supplied analysis queries recognizable while correcting
their production-monitoring semantics:

- cancellation is reported separately and is never success;
- an error signal overrides a reported success or cancellation;
- versions are discovered dynamically instead of hard-coding `5.991.3` or
  `5.996.0`;
- exact reviewed operation lists replace broad matching for issue decisions;
- cells with fewer than 20 physical rows are suppressed, and latency requires
  20 physical valid-duration rows;
- raw errors are converted to fixed safe categories inside Kusto.

The configured minimum and target versions and exact channel mappings are
currently empty. Each applicable query contains plainly named bindings for
them. Changes to those bindings, allowlists, the privacy floor, duration
maximums, or the Kusto location require a reviewed catalog update in source
control. Populating `criticalCommands` also requires a new fixed decision
query; the descriptive all-command queries do not replace that allowlist.

The daily recurrence runs at 10:00 UTC. `CompleteEnd=startofday(now()-2h)`
therefore selects the most recent complete UTC day after the two-hour ingestion
delay. Separate baseline rows pool the eight preceding matching weekdays for
Current and Previous. This makes the window logic correspond to the original
day-binned queries without the earlier catalog's cross-joins.

## Original-query mapping

| Supplied analysis | Fixed query |
|---|---|
| Activate duration and activation-operation duration/success | `daily_operation_trends` |
| Binary validation/install duration and success | `daily_operation_trends` |
| Design-time duration, cold/warm usage, and success | `daily_design_time_paths` |
| Creation-handler success | `daily_operation_trends` |
| Creation-handler top errors | `daily_safe_error_categories` |
| Top errors across commands | `daily_all_command_safe_error_categories` |
| Success across all commands | `daily_all_command_health` |
| Slowest commands | `daily_slowest_commands` |
| Commands with highest failure rate | `daily_high_failure_commands` |

The monitor additionally uses `daily_complete_windows`,
`telemetry_data_quality`, `extension_version_rollout`,
`daily_operation_health`, `daily_operation_cohorts`, and
`daily_hourly_health_bins`. These supply deterministic windows, quality
gates, pooled comparable baselines, cohort checks, and persistence.

Send only the KQL between a block's fence lines. Do not send the fences,
language label, heading, or prose. Every block is complete and independent.

## `daily_complete_windows`

```kusto
let CompleteEnd=startofday(now()-2h);
let CurrentStart=CompleteEnd-1d;
let PreviousStart=CurrentStart-1d;
range BaselineWeekOffset from 1 to 8 step 1
| project
    CurrentStart,
    CurrentEnd=CompleteEnd,
    PreviousStart,
    PreviousEnd=CurrentStart,
    BaselineWeekOffset,
    BaselineCurrentStart=CurrentStart-BaselineWeekOffset*7d,
    BaselineCurrentEnd=CompleteEnd-BaselineWeekOffset*7d,
    BaselinePreviousStart=PreviousStart-BaselineWeekOffset*7d,
    BaselinePreviousEnd=CurrentStart-BaselineWeekOffset*7d
```

## `telemetry_data_quality`

```kusto
let CompleteEnd=startofday(now()-2h);
let CurrentStart=CompleteEnd-1d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let Allowed=dynamic([
  "azureLogicAppsStandard.activate",
  "activate.logSubscriptions",
  "activate.ensureWorkspace",
  "activate.validateAndInstallBinaries",
  "validateAndInstallBinaries.ensureNodeJs",
  "validateAndInstallBinaries.ensureFuncCoreTools",
  "validateAndInstallBinaries.ensureDotnet",
  "validateAndInstallBinaries.ensureSdkLanguageServer",
  "activate.startDesignTimeApi",
  "validateRunningFuncProcess.startDesignTimeApi",
  "designTimeError.languageWorkerFailed.startDesignTimeApi",
  "designTimeError.portUnavailable.startDesignTimeApi",
  "startAllDesignTimeApis.startDesignTimeApi",
  "LocalDesignerPanel.create.startDesignTimeApi",
  "ConnectionPanel.create.startDesignTimeApi",
  "LocalDesignerV2Panel.create.startDesignTimeApi",
  "GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer.startDesignTimeApi",
  "createWorkspace",
  "createWorkspaceFromPackage",
  "createLogicApp",
  "createWorkflow",
  "createWorkspaceStructure"
]);
let KnownIgnored=dynamic([
  "activate.parameterizeAllConnections",
  "activate.ensureProjectFiles",
  "activate.ensureVSCodeFiles",
  "activate.enableLocalManagedIdentityAuth",
  "activate.startDesignTime",
  "activate.downloadExtensionBundle"
]);
let KnownRelevant=array_concat(Allowed,KnownIgnored);
let CurrentAll=materialize(
  VSCodeClient
  | where timestamp>=CurrentStart and timestamp<CompleteEnd
  | where name startswith Prefix
  | extend Operation=substring(name,strlen(Prefix))
);
let UnlistedRelevantOperationCount=toscalar(
  CurrentAll
  | where Operation startswith "activate."
      or Operation startswith "validateAndInstallBinaries."
      or Operation endswith ".startDesignTimeApi"
  | where array_index_of(KnownRelevant,Operation)<0
  | summarize dcount(Operation)
);
CurrentAll
| where array_index_of(Allowed,Operation)>=0
| extend
    dims=todynamic(customDimensions),
    measures=todynamic(customMeasurements),
    RawItemCount=tostring(itemCount),
    ItemCountNumber=todouble(itemCount)
| extend
    ExtensionVersion=tostring(dims["common.extversion"]),
    VersionWithoutPrerelease=tostring(split(tostring(dims["common.extversion"]),"-")[0]),
    RawResult=tostring(dims.result),
    RawDuration=tostring(measures.duration),
    DurationSeconds=todouble(measures.duration),
    IngestionDelayMinutes=todouble(datetime_diff("second",ingestion_time(),timestamp))/60.0
| extend VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0])
| summarize
    PhysicalRows=count(),
    LatestEvent=max(timestamp),
    IngestionDelayP50Minutes=percentile(IngestionDelayMinutes,50),
    IngestionDelayP95Minutes=percentile(IngestionDelayMinutes,95),
    MissingItemCountRows=countif(isempty(RawItemCount)),
    MalformedItemCountRows=countif(isnotempty(RawItemCount) and isnull(ItemCountNumber)),
    NonPositiveItemCountRows=countif(isnotnull(ItemCountNumber) and ItemCountNumber<1),
    SampledRows=countif(ItemCountNumber>1),
    MissingVersionRows=countif(isempty(ExtensionVersion)),
    MalformedVersionRows=countif(isnotempty(ExtensionVersion) and isnull(parse_version(VersionCore))),
    MissingResultRows=countif(isempty(RawResult)),
    UnknownResultRows=countif(isnotempty(RawResult) and RawResult !in~ ("Succeeded","Failed","Canceled","Cancelled")),
    MissingDurationRows=countif(isempty(RawDuration)),
    MalformedDurationRows=countif(isnotempty(RawDuration) and isnull(DurationSeconds)),
    NegativeDurationRows=countif(DurationSeconds<0),
    OutOfRangeDurationRows=countif(DurationSeconds>1800),
    ObservedOperationCount=dcount(Operation)
| extend
    FreshnessMinutes=datetime_diff("minute",CompleteEnd,LatestEvent),
    UnknownOutcomePercent=iff(
      PhysicalRows>0,
      100.0*todouble(MissingResultRows+UnknownResultRows)/PhysicalRows,
      real(null)),
    InvalidItemCountPercent=iff(
      PhysicalRows>0,
      100.0*todouble(MalformedItemCountRows+NonPositiveItemCountRows)/PhysicalRows,
      real(null)),
    SamplingDetected=SampledRows>0,
    ExpectedOperationCount=array_length(Allowed),
    UnlistedRelevantOperationCount,
    PrivacySuppressed=PhysicalRows<20
| extend Warnings=strcat(
    iff(PhysicalRows==0,"NO_CURRENT_DATA;",""),
    iff(PrivacySuppressed,"PRIVACY_SUPPRESSED;",""),
    iff(FreshnessMinutes>120,"STALE_DATA;",""),
    iff(isnull(IngestionDelayP50Minutes),"INGESTION_TIME_UNAVAILABLE;",""),
    iff(InvalidItemCountPercent>1.0,"INVALID_ITEM_COUNT;",""),
    iff(UnknownOutcomePercent>2.0,"GLOBAL_UNKNOWN_OUTCOME_CONTEXT;",""),
    iff(ObservedOperationCount<ExpectedOperationCount,"ALLOWLIST_COVERAGE_CONTEXT;",""),
    iff(UnlistedRelevantOperationCount>0,"UNLISTED_OPERATION_DRIFT;",""))
| project
    PhysicalRows=iff(PrivacySuppressed,long(null),PhysicalRows),
    LatestEvent=iff(PrivacySuppressed,datetime(null),LatestEvent),
    FreshnessMinutes=iff(PrivacySuppressed,long(null),FreshnessMinutes),
    IngestionDelayP50Minutes=iff(PrivacySuppressed,real(null),IngestionDelayP50Minutes),
    IngestionDelayP95Minutes=iff(PrivacySuppressed,real(null),IngestionDelayP95Minutes),
    SamplingDetected=iff(PrivacySuppressed,bool(null),SamplingDetected),
    MissingItemCountRows=iff(PrivacySuppressed,long(null),MissingItemCountRows),
    MalformedItemCountRows=iff(PrivacySuppressed,long(null),MalformedItemCountRows),
    NonPositiveItemCountRows=iff(PrivacySuppressed,long(null),NonPositiveItemCountRows),
    MissingVersionRows=iff(PrivacySuppressed,long(null),MissingVersionRows),
    MalformedVersionRows=iff(PrivacySuppressed,long(null),MalformedVersionRows),
    MissingResultRows=iff(PrivacySuppressed,long(null),MissingResultRows),
    UnknownResultRows=iff(PrivacySuppressed,long(null),UnknownResultRows),
    UnknownOutcomePercent=iff(PrivacySuppressed,real(null),UnknownOutcomePercent),
    InvalidItemCountPercent=iff(PrivacySuppressed,real(null),InvalidItemCountPercent),
    MissingDurationRows=iff(PrivacySuppressed,long(null),MissingDurationRows),
    MalformedDurationRows=iff(PrivacySuppressed,long(null),MalformedDurationRows),
    NegativeDurationRows=iff(PrivacySuppressed,long(null),NegativeDurationRows),
    OutOfRangeDurationRows=iff(PrivacySuppressed,long(null),OutOfRangeDurationRows),
    ObservedOperationCount=iff(PrivacySuppressed,long(null),ObservedOperationCount),
    UnlistedRelevantOperationCount=iff(PrivacySuppressed,long(null),UnlistedRelevantOperationCount),
    ExpectedOperationCount,
    PrivacySuppressed,
    Warnings
```

## `extension_version_rollout`

```kusto
let CompleteEnd=startofday(now()-2h);
let CurrentStart=CompleteEnd-1d;
let PreviousStart=CurrentStart-1d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let StableVersions=dynamic([]);
let PrereleaseVersions=dynamic([]);
let Recent=materialize(
VSCodeClient
| where timestamp>=PreviousStart and timestamp<CompleteEnd
| where name startswith Prefix
| extend
    Period=iff(timestamp>=CurrentStart,"Current","Previous"),
    dims=todynamic(customDimensions),
    RawWeight=tolong(itemCount)
| extend
    ExtensionVersion=tostring(dims["common.extversion"]),
    OS=coalesce(tostring(dims["common.os"]),"(missing)"),
    RuntimeCohort=coalesce(tostring(dims["common.remotename"]),"(missing)"),
    Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
| where isnotempty(ExtensionVersion)
);
let VersionHistory=
  VSCodeClient
  | where timestamp>=CompleteEnd-56d and timestamp<CompleteEnd
  | where name startswith Prefix
  | extend dims=todynamic(customDimensions)
  | extend ExtensionVersion=tostring(dims["common.extversion"])
  | where isnotempty(ExtensionVersion)
  | summarize VersionFirstSeenInLookback=min(timestamp) by ExtensionVersion;
let Totals=Recent | summarize TotalEvents=sum(Weight) by Period;
Recent
| extend
    VersionWithoutPrerelease=tostring(split(ExtensionVersion,"-")[0]),
    HasPrerelease=ExtensionVersion contains "-",
    PrereleaseAndBuild=iff(
      ExtensionVersion contains "-",
      tostring(split(ExtensionVersion,"-")[1]),
      "")
| extend
    VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0]),
    ReleaseChannel=case(
      array_index_of(StableVersions,ExtensionVersion)>=0,"stable",
      array_index_of(PrereleaseVersions,ExtensionVersion)>=0,"prerelease",
      HasPrerelease,
      tostring(split(tostring(split(PrereleaseAndBuild,"+")[0]),".")[0]),
      "unknown")
| where isnotnull(parse_version(VersionCore))
| summarize
    PhysicalRows=count(),
    FirstSeen=min(timestamp),
    LastSeen=max(timestamp),
    EstimatedEvents=sum(Weight)
  by Period,ExtensionVersion,VersionCore,ReleaseChannel,OS,RuntimeCohort
| where PhysicalRows>=20
| join kind=leftouter VersionHistory on ExtensionVersion
| join kind=inner Totals on Period
| extend
    TrafficShare=todouble(EstimatedEvents)/TotalEvents
| project
    Period,
    ExtensionVersion,
    VersionCore,
    ReleaseChannel,
    OS,
    RuntimeCohort,
    FirstSeen,
    LastSeen,
    VersionFirstSeenInLookback,
    PhysicalRows,
    EstimatedEvents,
    TrafficShare
| order by Period asc,TrafficShare desc
```

## `daily_operation_trends`

This is the direct, privacy-safe replacement for the supplied activation,
binary-validation, and creation-handler duration/success queries. It retains
daily bins for the last 30 complete UTC days.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-30d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let MinimumVersion="";
let TargetVersion="";
let Activation=dynamic([
  "azureLogicAppsStandard.activate",
  "activate.logSubscriptions",
  "activate.ensureWorkspace"
]);
let DependencyParents=dynamic(["activate.validateAndInstallBinaries"]);
let DependencyChildren=dynamic([
  "validateAndInstallBinaries.ensureNodeJs",
  "validateAndInstallBinaries.ensureFuncCoreTools",
  "validateAndInstallBinaries.ensureDotnet",
  "validateAndInstallBinaries.ensureSdkLanguageServer"
]);
let Creation=dynamic([
  "createWorkspace",
  "createWorkspaceFromPackage",
  "createLogicApp",
  "createWorkflow",
  "createWorkspaceStructure"
]);
let Allowed=array_concat(Activation,DependencyParents,DependencyChildren,Creation);
let Base=materialize(
  VSCodeClient
  | where timestamp>=WindowStart and timestamp<WindowEnd
  | where name startswith Prefix
  | extend Operation=substring(name,strlen(Prefix))
  | where array_index_of(Allowed,Operation)>=0
  | extend
      Day=startofday(timestamp),
      dims=todynamic(customDimensions),
      measures=todynamic(customMeasurements),
      RawWeight=tolong(itemCount)
  | extend
      ExtensionVersion=tostring(dims["common.extversion"]),
      VersionWithoutPrerelease=tostring(split(tostring(dims["common.extversion"]),"-")[0]),
      RawResult=tostring(dims.result),
      HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
      IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
      RawDuration=tostring(measures.duration),
      DurationSeconds=todouble(measures.duration),
      Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
  | extend VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0])
  | where (isempty(MinimumVersion) or parse_version(VersionCore)>=parse_version(MinimumVersion))
      and (isempty(TargetVersion) or ExtensionVersion==TargetVersion)
  | extend
      Family=case(
        array_index_of(Activation,Operation)>=0,"activation",
        array_index_of(DependencyParents,Operation)>=0,"dependency",
        array_index_of(DependencyChildren,Operation)>=0,"dependency",
        "creationHandlers"),
      DependencyLevel=case(
        array_index_of(DependencyParents,Operation)>=0,"Parent",
        array_index_of(DependencyChildren,Operation)>=0,"Child",
        "NotApplicable"),
      Outcome=case(
        HasError,"Failed",
        IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
        RawResult=~"Succeeded","Succeeded",
        RawResult=~"Failed","Failed",
        "Unknown"),
      DurationValid=isnotempty(RawDuration)
        and isnotnull(DurationSeconds)
        and DurationSeconds>=0
        and DurationSeconds<=1800
);
let Outcomes=
  Base
  | summarize
      PhysicalRows=count(),
      EstimatedEvents=sum(Weight),
      Succeeded=sumif(Weight,Outcome=="Succeeded"),
      Failed=sumif(Weight,Outcome=="Failed"),
      Canceled=sumif(Weight,Outcome=="Canceled"),
      Unknown=sumif(Weight,Outcome=="Unknown")
    by Day,Family,DependencyLevel,Operation;
let Latency=
  Base
  | where DurationValid
  | summarize
      ValidDurationRows=count(),
      ValidDurationEvents=sum(Weight),
      P50Seconds=percentilew(DurationSeconds,Weight,50),
      P90Seconds=percentilew(DurationSeconds,Weight,90)
    by Day,Family,DependencyLevel,Operation;
Outcomes
| join kind=leftouter Latency on Day,Family,DependencyLevel,Operation
| where PhysicalRows>=20
| extend
    EvaluableAttempts=Succeeded+Failed,
    DurationPublishable=coalesce(ValidDurationRows,long(0))>=20
| extend
    ActualSuccessRate=iff(EvaluableAttempts>0,todouble(Succeeded)/EvaluableAttempts,real(null)),
    FailureRate=iff(EvaluableAttempts>0,todouble(Failed)/EvaluableAttempts,real(null)),
    CancellationRate=todouble(Canceled)/EstimatedEvents,
    UnknownRate=todouble(Unknown)/EstimatedEvents
| project
    Day,
    Family,
    DependencyLevel,
    Operation,
    PhysicalRows,
    EstimatedEvents,
    Succeeded,
    Failed,
    Canceled,
    Unknown,
    EvaluableAttempts,
    ActualSuccessRate,
    FailureRate,
    CancellationRate,
    UnknownRate,
    ValidDurationRows=iff(DurationPublishable,ValidDurationRows,long(null)),
    ValidDurationEvents=iff(DurationPublishable,ValidDurationEvents,long(null)),
    P50Seconds=iff(DurationPublishable,P50Seconds,real(null)),
    P90Seconds=iff(DurationPublishable,P90Seconds,real(null))
| order by Day asc,Family asc,Operation asc
```

## `daily_operation_health`

This query supplies the pooled Current, Previous, and eight-comparable-day
baseline metrics used by the automatic gates.

```kusto
let CompleteEnd=startofday(now()-2h);
let CurrentStart=CompleteEnd-1d;
let PreviousStart=CurrentStart-1d;
let BaselineStart=PreviousStart-56d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let MinimumVersion="";
let TargetVersion="";
let Activation=dynamic([
  "azureLogicAppsStandard.activate",
  "activate.logSubscriptions",
  "activate.ensureWorkspace"
]);
let DependencyParents=dynamic(["activate.validateAndInstallBinaries"]);
let DependencyChildren=dynamic([
  "validateAndInstallBinaries.ensureNodeJs",
  "validateAndInstallBinaries.ensureFuncCoreTools",
  "validateAndInstallBinaries.ensureDotnet",
  "validateAndInstallBinaries.ensureSdkLanguageServer"
]);
let DesignTime=dynamic([
  "activate.startDesignTimeApi",
  "validateRunningFuncProcess.startDesignTimeApi",
  "designTimeError.languageWorkerFailed.startDesignTimeApi",
  "designTimeError.portUnavailable.startDesignTimeApi",
  "startAllDesignTimeApis.startDesignTimeApi",
  "LocalDesignerPanel.create.startDesignTimeApi",
  "ConnectionPanel.create.startDesignTimeApi",
  "LocalDesignerV2Panel.create.startDesignTimeApi",
  "GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer.startDesignTimeApi"
]);
let Creation=dynamic([
  "createWorkspace",
  "createWorkspaceFromPackage",
  "createLogicApp",
  "createWorkflow",
  "createWorkspaceStructure"
]);
let Allowed=array_concat(Activation,DependencyParents,DependencyChildren,DesignTime,Creation);
let Base=materialize(
  VSCodeClient
  | where timestamp>=BaselineStart and timestamp<CompleteEnd
  | where name startswith Prefix
  | extend
      Day=startofday(timestamp),
      Operation=substring(name,strlen(Prefix))
  | where array_index_of(Allowed,Operation)>=0
  | extend Period=case(
      Day==CurrentStart,"Current",
      Day==PreviousStart,"Previous",
      dayofweek(Day)==dayofweek(CurrentStart),"BaselineCurrent",
      dayofweek(Day)==dayofweek(PreviousStart),"BaselinePrevious",
      "Ignore")
  | where Period!="Ignore"
  | extend
      dims=todynamic(customDimensions),
      measures=todynamic(customMeasurements),
      RawWeight=tolong(itemCount)
  | extend
      ExtensionVersion=tostring(dims["common.extversion"]),
      VersionWithoutPrerelease=tostring(split(tostring(dims["common.extversion"]),"-")[0]),
      RawResult=tostring(dims.result),
      HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
      IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
      DidStart=coalesce(tobool(dims.didStartDesignTime),false),
      IsUp=coalesce(tobool(dims.isDesignTimeUp),false),
      Skipping=coalesce(tobool(dims.skippingAlreadyInProgress),false),
      RawDuration=tostring(measures.duration),
      DurationSeconds=todouble(measures.duration),
      Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
  | extend VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0])
  | where (isempty(MinimumVersion) or parse_version(VersionCore)>=parse_version(MinimumVersion))
      and (isempty(TargetVersion) or ExtensionVersion==TargetVersion)
  | extend
      Family=case(
        array_index_of(Activation,Operation)>=0,"activation",
        array_index_of(DependencyParents,Operation)>=0,"dependency",
        array_index_of(DependencyChildren,Operation)>=0,"dependency",
        array_index_of(DesignTime,Operation)>=0,"designTime",
        "creationHandlers"),
      DependencyLevel=case(
        array_index_of(DependencyParents,Operation)>=0,"Parent",
        array_index_of(DependencyChildren,Operation)>=0,"Child",
        "NotApplicable"),
      StartupPath=case(
        array_index_of(DesignTime,Operation)<0,"NotApplicable",
        Skipping,"AwaitingExistingStartup",
        DidStart,"SpawnedStartupInvocation",
        IsUp and not(DidStart),"AlreadyResponsive",
        "Unclassified"),
      Outcome=case(
        HasError,"Failed",
        IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
        RawResult=~"Succeeded","Succeeded",
        RawResult=~"Failed","Failed",
        "Unknown"),
      DurationState=case(
        isempty(RawDuration),"Missing",
        isnull(DurationSeconds),"Malformed",
        DurationSeconds<0,"Negative",
        DurationSeconds>1800,"OutOfRange",
        "Valid")
);
let Outcomes=
  Base
  | summarize
      PhysicalRows=count(),
      EstimatedEvents=sum(Weight),
      Succeeded=sumif(Weight,Outcome=="Succeeded"),
      Failed=sumif(Weight,Outcome=="Failed"),
      Canceled=sumif(Weight,Outcome=="Canceled"),
      Unknown=sumif(Weight,Outcome=="Unknown"),
      MissingDurations=sumif(Weight,DurationState=="Missing"),
      MalformedDurations=sumif(Weight,DurationState=="Malformed"),
      NegativeDurations=sumif(Weight,DurationState=="Negative"),
      OutOfRangeDurations=sumif(Weight,DurationState=="OutOfRange")
    by Period,Family,DependencyLevel,Operation,StartupPath;
let Latency=
  Base
  | where DurationState=="Valid"
  | summarize
      ValidDurationRows=count(),
      ValidDurationEvents=sum(Weight),
      P50Seconds=percentilew(DurationSeconds,Weight,50),
      P90Seconds=percentilew(DurationSeconds,Weight,90),
      P95Seconds=percentilew(DurationSeconds,Weight,95)
    by Period,Family,DependencyLevel,Operation,StartupPath;
Outcomes
| join kind=leftouter Latency on Period,Family,DependencyLevel,Operation,StartupPath
| where PhysicalRows>=20
| extend
    EvaluableAttempts=Succeeded+Failed,
    DurationPublishable=coalesce(ValidDurationRows,long(0))>=20
| extend
    ActualSuccessRate=iff(EvaluableAttempts>0,todouble(Succeeded)/EvaluableAttempts,real(null)),
    FailureRate=iff(EvaluableAttempts>0,todouble(Failed)/EvaluableAttempts,real(null)),
    CancellationRate=todouble(Canceled)/EstimatedEvents,
    UnknownRate=todouble(Unknown)/EstimatedEvents
| project
    Period,
    Family,
    DependencyLevel,
    Operation,
    StartupPath,
    PhysicalRows,
    EstimatedEvents,
    Succeeded,
    Failed,
    Canceled,
    Unknown,
    EvaluableAttempts,
    ActualSuccessRate,
    FailureRate,
    CancellationRate,
    UnknownRate,
    ValidDurationRows=iff(DurationPublishable,ValidDurationRows,long(null)),
    ValidDurationEvents=iff(DurationPublishable,ValidDurationEvents,long(null)),
    P50Seconds=iff(DurationPublishable,P50Seconds,real(null)),
    P90Seconds=iff(DurationPublishable,P90Seconds,real(null)),
    P95Seconds=iff(DurationPublishable,P95Seconds,real(null)),
    MissingDurations,
    MalformedDurations,
    NegativeDurations,
    OutOfRangeDurations
| order by Family asc,Operation asc,StartupPath asc,Period asc
```

## `daily_design_time_paths`

This query combines the supplied 15-day design-time duration, cold/warm usage,
and success analyses. `AwaitingExistingStartup` is not an independent startup.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-15d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let MinimumVersion="";
let TargetVersion="";
let DesignTime=dynamic([
  "activate.startDesignTimeApi",
  "validateRunningFuncProcess.startDesignTimeApi",
  "designTimeError.languageWorkerFailed.startDesignTimeApi",
  "designTimeError.portUnavailable.startDesignTimeApi",
  "startAllDesignTimeApis.startDesignTimeApi",
  "LocalDesignerPanel.create.startDesignTimeApi",
  "ConnectionPanel.create.startDesignTimeApi",
  "LocalDesignerV2Panel.create.startDesignTimeApi",
  "GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer.startDesignTimeApi"
]);
let Base=materialize(
  VSCodeClient
  | where timestamp>=WindowStart and timestamp<WindowEnd
  | where name startswith Prefix
  | extend
      Day=startofday(timestamp),
      Operation=substring(name,strlen(Prefix))
  | where array_index_of(DesignTime,Operation)>=0
  | extend
      dims=todynamic(customDimensions),
      measures=todynamic(customMeasurements),
      RawWeight=tolong(itemCount)
  | extend
      ExtensionVersion=tostring(dims["common.extversion"]),
      VersionWithoutPrerelease=tostring(split(tostring(dims["common.extversion"]),"-")[0]),
      RawResult=tostring(dims.result),
      HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
      IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
      DidStart=coalesce(tobool(dims.didStartDesignTime),false),
      IsUp=coalesce(tobool(dims.isDesignTimeUp),false),
      Skipping=coalesce(tobool(dims.skippingAlreadyInProgress),false),
      RawDuration=tostring(measures.duration),
      DurationSeconds=todouble(measures.duration),
      Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
  | extend VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0])
  | where (isempty(MinimumVersion) or parse_version(VersionCore)>=parse_version(MinimumVersion))
      and (isempty(TargetVersion) or ExtensionVersion==TargetVersion)
  | extend
      StartupPath=case(
        Skipping,"AwaitingExistingStartup",
        DidStart,"SpawnedStartupInvocation",
        IsUp and not(DidStart),"AlreadyResponsive",
        "Unclassified"),
      Outcome=case(
        HasError,"Failed",
        IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
        RawResult=~"Succeeded","Succeeded",
        RawResult=~"Failed","Failed",
        "Unknown"),
      DurationValid=isnotempty(RawDuration)
        and isnotnull(DurationSeconds)
        and DurationSeconds>=0
        and DurationSeconds<=1800
);
let Outcomes=
  Base
  | summarize
      PhysicalRows=count(),
      EstimatedEvents=sum(Weight),
      Succeeded=sumif(Weight,Outcome=="Succeeded"),
      Failed=sumif(Weight,Outcome=="Failed"),
      Canceled=sumif(Weight,Outcome=="Canceled"),
      Unknown=sumif(Weight,Outcome=="Unknown")
    by Day,Operation,StartupPath;
let Latency=
  Base
  | where DurationValid
  | summarize
      ValidDurationRows=count(),
      ValidDurationEvents=sum(Weight),
      P50Seconds=percentilew(DurationSeconds,Weight,50),
      P90Seconds=percentilew(DurationSeconds,Weight,90),
      P95Seconds=percentilew(DurationSeconds,Weight,95)
    by Day,Operation,StartupPath;
Outcomes
| join kind=leftouter Latency on Day,Operation,StartupPath
| where PhysicalRows>=20
| extend
    EvaluableAttempts=Succeeded+Failed,
    DurationPublishable=coalesce(ValidDurationRows,long(0))>=20
| extend
    ActualSuccessRate=iff(EvaluableAttempts>0,todouble(Succeeded)/EvaluableAttempts,real(null)),
    CancellationRate=todouble(Canceled)/EstimatedEvents,
    UnknownRate=todouble(Unknown)/EstimatedEvents
| project
    Day,
    Operation,
    StartupPath,
    PhysicalRows,
    EstimatedEvents,
    Succeeded,
    Failed,
    Canceled,
    Unknown,
    EvaluableAttempts,
    ActualSuccessRate,
    CancellationRate,
    UnknownRate,
    ValidDurationRows=iff(DurationPublishable,ValidDurationRows,long(null)),
    ValidDurationEvents=iff(DurationPublishable,ValidDurationEvents,long(null)),
    P50Seconds=iff(DurationPublishable,P50Seconds,real(null)),
    P90Seconds=iff(DurationPublishable,P90Seconds,real(null)),
    P95Seconds=iff(DurationPublishable,P95Seconds,real(null))
| order by Day asc,Operation asc,StartupPath asc
```

## `daily_safe_error_categories`

This is the privacy-safe error query for reviewed operations, including the
supplied creation-handler analysis. The category checks are intentionally
plain text tests rather than regular expressions. A category corroborates a
candidate from `daily_operation_health`; it cannot trigger mutation alone.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-15d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let Allowed=dynamic([
  "azureLogicAppsStandard.activate",
  "activate.logSubscriptions",
  "activate.ensureWorkspace",
  "activate.validateAndInstallBinaries",
  "validateAndInstallBinaries.ensureNodeJs",
  "validateAndInstallBinaries.ensureFuncCoreTools",
  "validateAndInstallBinaries.ensureDotnet",
  "validateAndInstallBinaries.ensureSdkLanguageServer",
  "activate.startDesignTimeApi",
  "validateRunningFuncProcess.startDesignTimeApi",
  "designTimeError.languageWorkerFailed.startDesignTimeApi",
  "designTimeError.portUnavailable.startDesignTimeApi",
  "startAllDesignTimeApis.startDesignTimeApi",
  "LocalDesignerPanel.create.startDesignTimeApi",
  "ConnectionPanel.create.startDesignTimeApi",
  "LocalDesignerV2Panel.create.startDesignTimeApi",
  "GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer.startDesignTimeApi",
  "createWorkspace",
  "createWorkspaceFromPackage",
  "createLogicApp",
  "createWorkflow",
  "createWorkspaceStructure"
]);
VSCodeClient
| where timestamp>=WindowStart and timestamp<WindowEnd
| where name startswith Prefix
| extend
    Operation=substring(name,strlen(Prefix)),
    dims=todynamic(customDimensions),
    RawWeight=tolong(itemCount)
| where array_index_of(Allowed,Operation)>=0
| extend
    RawResult=tostring(dims.result),
    ErrorMessage=tostring(dims.errorMessage),
    ErrorMessageV2=tostring(dims.errorMessageV2),
    Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
| where RawResult=~"Failed" or isnotempty(ErrorMessage) or isnotempty(ErrorMessageV2)
| extend ErrorText=strcat(ErrorMessage," ",ErrorMessageV2)
| extend SafeErrorCategory=case(
    ErrorText has "timeout" or ErrorText contains "timed out","Timeout",
    ErrorText contains "connect" or ErrorText contains "refused" or ErrorText contains "unreachable" or ErrorText contains "socket","Connection",
    ErrorText has "port" or ErrorText has "eaddrinuse","Port",
    ErrorText contains "permission" or ErrorText contains "access denied" or ErrorText contains "eacces" or ErrorText contains "eperm","Permission",
    ErrorText has "file" or ErrorText has "directory" or ErrorText has "dependency" or ErrorText has "binary" or ErrorText has "enoent","DependencyOrFile",
    ErrorText has "tls" or ErrorText has "ssl" or ErrorText has "certificate" or ErrorText has "transport","TransportSecurity",
    ErrorText has "auth" or ErrorText has "authentication" or ErrorText has "authorization" or ErrorText has "credential" or ErrorText has "token" or ErrorText has "unauthorized" or ErrorText has "forbidden","Authentication",
    "Other")
| summarize PhysicalRows=count(),EstimatedEvents=sum(Weight) by Operation,SafeErrorCategory
| where PhysicalRows>=20
| order by EstimatedEvents desc
```

## `daily_all_command_safe_error_categories`

This is the privacy-safe replacement for the supplied raw all-command error
query. It is descriptive and cannot independently trigger issue mutation.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-15d;
let EventPrefix="ms-azuretools.vscode-azurelogicapps/";
let CommandPrefix="ms-azuretools.vscode-azurelogicapps/azureLogicAppsStandard.";
VSCodeClient
| where timestamp>=WindowStart and timestamp<WindowEnd
| where name startswith CommandPrefix
| extend
    Operation=substring(name,strlen(EventPrefix)),
    dims=todynamic(customDimensions),
    RawWeight=tolong(itemCount)
| extend
    RawResult=tostring(dims.result),
    ErrorMessage=tostring(dims.errorMessage),
    ErrorMessageV2=tostring(dims.errorMessageV2),
    Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
| where tostring(dims.isActivationEvent)!="true"
| where RawResult=~"Failed" or isnotempty(ErrorMessage) or isnotempty(ErrorMessageV2)
| extend ErrorText=strcat(ErrorMessage," ",ErrorMessageV2)
| extend SafeErrorCategory=case(
    ErrorText has "timeout" or ErrorText contains "timed out","Timeout",
    ErrorText contains "connect" or ErrorText contains "refused" or ErrorText contains "unreachable" or ErrorText contains "socket","Connection",
    ErrorText has "port" or ErrorText has "eaddrinuse","Port",
    ErrorText contains "permission" or ErrorText contains "access denied" or ErrorText contains "eacces" or ErrorText contains "eperm","Permission",
    ErrorText has "file" or ErrorText has "directory" or ErrorText has "dependency" or ErrorText has "binary" or ErrorText has "enoent","DependencyOrFile",
    ErrorText has "tls" or ErrorText has "ssl" or ErrorText has "certificate" or ErrorText has "transport","TransportSecurity",
    ErrorText has "auth" or ErrorText has "authentication" or ErrorText has "authorization" or ErrorText has "credential" or ErrorText has "token" or ErrorText has "unauthorized" or ErrorText has "forbidden","Authentication",
    "Other")
| summarize PhysicalRows=count(),EstimatedEvents=sum(Weight) by Operation,SafeErrorCategory
| where PhysicalRows>=20
| order by EstimatedEvents desc
```

## `daily_all_command_health`

This corresponds to the supplied all-command success-rate query. It is
descriptive and cannot independently trigger issue mutation.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-30d;
let EventPrefix="ms-azuretools.vscode-azurelogicapps/";
let CommandPrefix="ms-azuretools.vscode-azurelogicapps/azureLogicAppsStandard.";
VSCodeClient
| where timestamp>=WindowStart and timestamp<WindowEnd
| where name startswith CommandPrefix
| extend
    Day=startofday(timestamp),
    Operation=substring(name,strlen(EventPrefix)),
    dims=todynamic(customDimensions),
    RawWeight=tolong(itemCount)
| extend
    RawResult=tostring(dims.result),
    HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
    IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
    Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
| where tostring(dims.isActivationEvent)!="true"
| extend Outcome=case(
    HasError,"Failed",
    IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
    RawResult=~"Succeeded","Succeeded",
    RawResult=~"Failed","Failed",
    "Unknown")
| summarize
    PhysicalRows=count(),
    EstimatedEvents=sum(Weight),
    Succeeded=sumif(Weight,Outcome=="Succeeded"),
    Failed=sumif(Weight,Outcome=="Failed"),
    Canceled=sumif(Weight,Outcome=="Canceled"),
    Unknown=sumif(Weight,Outcome=="Unknown")
  by Day,Operation
| where PhysicalRows>=20
| extend EvaluableAttempts=Succeeded+Failed
| extend
    ActualSuccessRate=iff(EvaluableAttempts>0,todouble(Succeeded)/EvaluableAttempts,real(null)),
    CancellationRate=todouble(Canceled)/EstimatedEvents,
    UnknownRate=todouble(Unknown)/EstimatedEvents
| order by Day asc,Operation asc
```

## `daily_slowest_commands`

This corresponds to the supplied slowest-commands query.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-15d;
let EventPrefix="ms-azuretools.vscode-azurelogicapps/";
let CommandPrefix="ms-azuretools.vscode-azurelogicapps/azureLogicAppsStandard.";
VSCodeClient
| where timestamp>=WindowStart and timestamp<WindowEnd
| where name startswith CommandPrefix
| extend
    Operation=substring(name,strlen(EventPrefix)),
    dims=todynamic(customDimensions),
    measures=todynamic(customMeasurements),
    RawWeight=tolong(itemCount)
| extend
    RawResult=tostring(dims.result),
    HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
    DurationSeconds=todouble(measures.duration),
    Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
| where tostring(dims.isActivationEvent)!="true"
| where RawResult=~"Succeeded"
    and not(HasError)
    and isnotnull(DurationSeconds)
    and DurationSeconds>=0
    and DurationSeconds<=1800
| summarize
    ValidDurationRows=count(),
    ValidDurationEvents=sum(Weight),
    P50Seconds=percentilew(DurationSeconds,Weight,50),
    P90Seconds=percentilew(DurationSeconds,Weight,90)
  by Operation
| where ValidDurationRows>=20
| top 20 by P50Seconds desc
```

## `daily_high_failure_commands`

This corresponds to the supplied highest-failure-rate query.

```kusto
let WindowEnd=startofday(now()-2h);
let WindowStart=WindowEnd-15d;
let EventPrefix="ms-azuretools.vscode-azurelogicapps/";
let CommandPrefix="ms-azuretools.vscode-azurelogicapps/azureLogicAppsStandard.";
VSCodeClient
| where timestamp>=WindowStart and timestamp<WindowEnd
| where name startswith CommandPrefix
| extend
    Operation=substring(name,strlen(EventPrefix)),
    dims=todynamic(customDimensions),
    RawWeight=tolong(itemCount)
| extend
    RawResult=tostring(dims.result),
    HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
    IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
    Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
| where tostring(dims.isActivationEvent)!="true"
| extend Outcome=case(
    HasError,"Failed",
    IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
    RawResult=~"Succeeded","Succeeded",
    RawResult=~"Failed","Failed",
    "Unknown")
| summarize
    PhysicalRows=count(),
    EstimatedEvents=sum(Weight),
    Succeeded=sumif(Weight,Outcome=="Succeeded"),
    Failed=sumif(Weight,Outcome=="Failed"),
    Canceled=sumif(Weight,Outcome=="Canceled"),
    Unknown=sumif(Weight,Outcome=="Unknown")
  by Operation
| where PhysicalRows>=20
| extend EvaluableAttempts=Succeeded+Failed
| where EvaluableAttempts>0
| extend
    FailureRate=todouble(Failed)/EvaluableAttempts
| where FailureRate>0
| order by FailureRate desc,Failed desc
| take 20
```

## `daily_operation_cohorts`

This added monitor query checks whether an aggregate candidate is explained by
version, release channel, OS, or runtime mix. It runs only for Current and
Previous to keep the result bounded.

```kusto
let CompleteEnd=startofday(now()-2h);
let CurrentStart=CompleteEnd-1d;
let PreviousStart=CurrentStart-1d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let MinimumVersion="";
let TargetVersion="";
let StableVersions=dynamic([]);
let PrereleaseVersions=dynamic([]);
let Allowed=dynamic([
  "azureLogicAppsStandard.activate",
  "activate.logSubscriptions",
  "activate.ensureWorkspace",
  "activate.validateAndInstallBinaries",
  "validateAndInstallBinaries.ensureNodeJs",
  "validateAndInstallBinaries.ensureFuncCoreTools",
  "validateAndInstallBinaries.ensureDotnet",
  "validateAndInstallBinaries.ensureSdkLanguageServer",
  "activate.startDesignTimeApi",
  "validateRunningFuncProcess.startDesignTimeApi",
  "designTimeError.languageWorkerFailed.startDesignTimeApi",
  "designTimeError.portUnavailable.startDesignTimeApi",
  "startAllDesignTimeApis.startDesignTimeApi",
  "LocalDesignerPanel.create.startDesignTimeApi",
  "ConnectionPanel.create.startDesignTimeApi",
  "LocalDesignerV2Panel.create.startDesignTimeApi",
  "GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer.startDesignTimeApi",
  "createWorkspace",
  "createWorkspaceFromPackage",
  "createLogicApp",
  "createWorkflow",
  "createWorkspaceStructure"
]);
let Base=materialize(
  VSCodeClient
  | where timestamp>=PreviousStart and timestamp<CompleteEnd
  | where name startswith Prefix
  | extend
      Period=iff(timestamp>=CurrentStart,"Current","Previous"),
      Operation=substring(name,strlen(Prefix)),
      dims=todynamic(customDimensions),
      measures=todynamic(customMeasurements),
      RawWeight=tolong(itemCount)
  | where array_index_of(Allowed,Operation)>=0
  | extend
      ExtensionVersion=coalesce(tostring(dims["common.extversion"]),"(missing)"),
      VersionWithoutPrerelease=tostring(split(tostring(dims["common.extversion"]),"-")[0]),
      PrereleaseAndBuild=iff(
        tostring(dims["common.extversion"]) contains "-",
        tostring(split(tostring(dims["common.extversion"]),"-")[1]),
        ""),
      OS=coalesce(tostring(dims["common.os"]),"(missing)"),
      RuntimeCohort=coalesce(tostring(dims["common.remotename"]),"(missing)"),
      RawResult=tostring(dims.result),
      HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
      IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
      DidStart=coalesce(tobool(dims.didStartDesignTime),false),
      IsUp=coalesce(tobool(dims.isDesignTimeUp),false),
      Skipping=coalesce(tobool(dims.skippingAlreadyInProgress),false),
      DurationSeconds=todouble(measures.duration),
      Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
  | extend
      VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0]),
      ReleaseChannel=case(
        array_index_of(StableVersions,ExtensionVersion)>=0,"stable",
        array_index_of(PrereleaseVersions,ExtensionVersion)>=0,"prerelease",
        ExtensionVersion contains "-",
        tostring(split(tostring(split(PrereleaseAndBuild,"+")[0]),".")[0]),
        "unknown"),
      Outcome=case(
        HasError,"Failed",
        IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
        RawResult=~"Succeeded","Succeeded",
        RawResult=~"Failed","Failed",
        "Unknown"),
      StartupPath=case(
        not(Operation endswith ".startDesignTimeApi"),"NotApplicable",
        Skipping,"AwaitingExistingStartup",
        DidStart,"SpawnedStartupInvocation",
        IsUp and not(DidStart),"AlreadyResponsive",
        "Unclassified"),
      DurationValid=isnotnull(DurationSeconds)
        and DurationSeconds>=0
        and DurationSeconds<=1800
  | where (isempty(MinimumVersion) or parse_version(VersionCore)>=parse_version(MinimumVersion))
      and (isempty(TargetVersion) or ExtensionVersion==TargetVersion)
);
let Outcomes=
  Base
  | summarize
      PhysicalRows=count(),
      EstimatedEvents=sum(Weight),
      Succeeded=sumif(Weight,Outcome=="Succeeded"),
      Failed=sumif(Weight,Outcome=="Failed"),
      Canceled=sumif(Weight,Outcome=="Canceled"),
      Unknown=sumif(Weight,Outcome=="Unknown")
    by Period,Operation,StartupPath,ExtensionVersion,VersionCore,ReleaseChannel,OS,RuntimeCohort;
let Latency=
  Base
  | where DurationValid
  | summarize
      ValidDurationRows=count(),
      ValidDurationEvents=sum(Weight),
      P95Seconds=percentilew(DurationSeconds,Weight,95)
    by Period,Operation,StartupPath,ExtensionVersion,VersionCore,ReleaseChannel,OS,RuntimeCohort;
Outcomes
| join kind=leftouter Latency
  on Period,Operation,StartupPath,ExtensionVersion,VersionCore,ReleaseChannel,OS,RuntimeCohort
| where PhysicalRows>=20
| extend
    EvaluableAttempts=Succeeded+Failed,
    DurationPublishable=coalesce(ValidDurationRows,long(0))>=20
| extend
    ActualSuccessRate=iff(EvaluableAttempts>0,todouble(Succeeded)/EvaluableAttempts,real(null)),
    FailureRate=iff(EvaluableAttempts>0,todouble(Failed)/EvaluableAttempts,real(null)),
    CancellationRate=todouble(Canceled)/EstimatedEvents,
    UnknownRate=todouble(Unknown)/EstimatedEvents
| project
    Period,
    Operation,
    StartupPath,
    ExtensionVersion,
    VersionCore,
    ReleaseChannel,
    OS,
    RuntimeCohort,
    PhysicalRows,
    EstimatedEvents,
    Succeeded,
    Failed,
    Canceled,
    Unknown,
    EvaluableAttempts,
    ActualSuccessRate,
    FailureRate,
    CancellationRate,
    UnknownRate,
    ValidDurationRows=iff(DurationPublishable,ValidDurationRows,long(null)),
    ValidDurationEvents=iff(DurationPublishable,ValidDurationEvents,long(null)),
    P95Seconds=iff(DurationPublishable,P95Seconds,real(null))
| order by Operation asc,Period asc,EstimatedEvents desc
```

## `daily_hourly_health_bins`

This added monitor query supplies outcome and latency persistence for Current
and Previous.

```kusto
let CompleteEnd=startofday(now()-2h);
let CurrentStart=CompleteEnd-1d;
let PreviousStart=CurrentStart-1d;
let Prefix="ms-azuretools.vscode-azurelogicapps/";
let MinimumVersion="";
let TargetVersion="";
let Allowed=dynamic([
  "azureLogicAppsStandard.activate",
  "activate.logSubscriptions",
  "activate.ensureWorkspace",
  "activate.validateAndInstallBinaries",
  "validateAndInstallBinaries.ensureNodeJs",
  "validateAndInstallBinaries.ensureFuncCoreTools",
  "validateAndInstallBinaries.ensureDotnet",
  "validateAndInstallBinaries.ensureSdkLanguageServer",
  "activate.startDesignTimeApi",
  "validateRunningFuncProcess.startDesignTimeApi",
  "designTimeError.languageWorkerFailed.startDesignTimeApi",
  "designTimeError.portUnavailable.startDesignTimeApi",
  "startAllDesignTimeApis.startDesignTimeApi",
  "LocalDesignerPanel.create.startDesignTimeApi",
  "ConnectionPanel.create.startDesignTimeApi",
  "LocalDesignerV2Panel.create.startDesignTimeApi",
  "GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer.startDesignTimeApi",
  "createWorkspace",
  "createWorkspaceFromPackage",
  "createLogicApp",
  "createWorkflow",
  "createWorkspaceStructure"
]);
let Base=materialize(
  VSCodeClient
  | where timestamp>=PreviousStart and timestamp<CompleteEnd
  | where name startswith Prefix
  | extend
      Period=iff(timestamp>=CurrentStart,"Current","Previous"),
      HourStart=bin(timestamp,1h),
      Operation=substring(name,strlen(Prefix)),
      dims=todynamic(customDimensions),
      measures=todynamic(customMeasurements),
      RawWeight=tolong(itemCount)
  | where array_index_of(Allowed,Operation)>=0
  | extend
      RawResult=tostring(dims.result),
      HasError=isnotempty(tostring(dims.errorMessage)) or isnotempty(tostring(dims.errorMessageV2)),
      IsCanceled=coalesce(tobool(dims.isUserCancelled),false),
      ExtensionVersion=tostring(dims["common.extversion"]),
      VersionWithoutPrerelease=tostring(split(tostring(dims["common.extversion"]),"-")[0]),
      DidStart=coalesce(tobool(dims.didStartDesignTime),false),
      IsUp=coalesce(tobool(dims.isDesignTimeUp),false),
      Skipping=coalesce(tobool(dims.skippingAlreadyInProgress),false),
      DurationSeconds=todouble(measures.duration),
      Weight=iff(isnull(RawWeight) or RawWeight<1,long(1),RawWeight)
  | extend VersionCore=tostring(split(VersionWithoutPrerelease,"+")[0])
  | where (isempty(MinimumVersion) or parse_version(VersionCore)>=parse_version(MinimumVersion))
      and (isempty(TargetVersion) or ExtensionVersion==TargetVersion)
  | extend
      Outcome=case(
        HasError,"Failed",
        IsCanceled or RawResult in~ ("Canceled","Cancelled"),"Canceled",
        RawResult=~"Succeeded","Succeeded",
        RawResult=~"Failed","Failed",
        "Unknown"),
      StartupPath=case(
        not(Operation endswith ".startDesignTimeApi"),"NotApplicable",
        Skipping,"AwaitingExistingStartup",
        DidStart,"SpawnedStartupInvocation",
        IsUp and not(DidStart),"AlreadyResponsive",
        "Unclassified"),
      DurationValid=isnotnull(DurationSeconds)
        and DurationSeconds>=0
        and DurationSeconds<=1800
);
let Outcomes=
  Base
  | summarize
      PhysicalRows=count(),
      EstimatedEvents=sum(Weight),
      Succeeded=sumif(Weight,Outcome=="Succeeded"),
      Failed=sumif(Weight,Outcome=="Failed"),
      Canceled=sumif(Weight,Outcome=="Canceled"),
      Unknown=sumif(Weight,Outcome=="Unknown")
    by Period,HourStart,Operation,StartupPath;
let Latency=
  Base
  | where DurationValid
  | summarize
      ValidDurationRows=count(),
      ValidDurationEvents=sum(Weight),
      P50Seconds=percentilew(DurationSeconds,Weight,50),
      P90Seconds=percentilew(DurationSeconds,Weight,90),
      P95Seconds=percentilew(DurationSeconds,Weight,95)
    by Period,HourStart,Operation,StartupPath;
Outcomes
| join kind=leftouter Latency on Period,HourStart,Operation,StartupPath
| where PhysicalRows>=20
| extend
    EvaluableAttempts=Succeeded+Failed,
    DurationPublishable=coalesce(ValidDurationRows,long(0))>=20
| extend
    ActualSuccessRate=iff(EvaluableAttempts>0,todouble(Succeeded)/EvaluableAttempts,real(null)),
    FailureRate=iff(EvaluableAttempts>0,todouble(Failed)/EvaluableAttempts,real(null))
| project
    Period,
    HourStart,
    Operation,
    StartupPath,
    PhysicalRows,
    EstimatedEvents,
    Succeeded,
    Failed,
    Canceled,
    Unknown,
    EvaluableAttempts,
    ActualSuccessRate,
    FailureRate,
    ValidDurationRows=iff(DurationPublishable,ValidDurationRows,long(null)),
    ValidDurationEvents=iff(DurationPublishable,ValidDurationEvents,long(null)),
    P50Seconds=iff(DurationPublishable,P50Seconds,real(null)),
    P90Seconds=iff(DurationPublishable,P90Seconds,real(null)),
    P95Seconds=iff(DurationPublishable,P95Seconds,real(null))
| order by Period asc,HourStart asc,Operation asc
```
