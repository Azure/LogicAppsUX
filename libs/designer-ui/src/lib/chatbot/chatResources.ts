export interface ChatResources {
  Title: string;
  PreviewPill: string;
  Close: string;
  InputPlaceholder: string;
  Submit: string;
  Actions: string;
  Save: string;
  Test: string;
  DefaultMessages: {
    FlowCreated: string;
    TechnicalError: string;
    ThrottlingError: string;
    NoAnswer: string;
    FlowUpdatedWithNoDiff: string;
  };
  AIGeneratedDisclaimer: string;
  Undo: string;
  Copy: string;
  ActionUndone: string;
  AINoticeFormat: string;
  SeePreviewTerms: string;
  FirstRunExperience: {
    Next: string;
    Back: string;
    GetStarted: string;
    StepperFormat: string;
    FirstStep: {
      Title: string;
      Description: string;
    };
    SecondStep: {
      Title: string;
      Description: {
        Item1: string;
        Item2: string;
        Item3: string;
      };
    };
    ThirdStep: {
      Title: string;
      Description: {
        Item1: string;
        Item2: string;
        Item3: string;
      };
    };
  };
  GreetingMessage: {
    FromNL2Flow: string;
    FromOpenedFlow: string;
    SuggestedPrompts: {
      FirstItem: string;
      SecondItem: string;
    };
    SaveYourFlow: string;
  };
  OperationsNeedingAttentionMessage: {
    SavingDescription_plural: string;
    EditingDescription_plural: string;
    AllRequiredParametersAreSetMessage: string;
  };
  HomePageBanner: {
    Title: string;
    Submit: string;
    Actions: string;
    SuggestedFlowHeader: string;
    Placeholder: string;
    AINoticeFormat: string;
    SeePreviewTerms: string;
  };
  ChatProgressCard: {
    Working: string;
    StopGenerating: string;
    Saving: string;
  };
  ConnectionsSetupCard: {
    Description: string;
    Skip: string;
    ConnectedFormat: string;
    NotConnectedFormat: string;
    ConnectionsLoading: string;
  };
  UpdatingFlowCard: {
    AddedOperationSentenceFormat: string;
    RemovedOperationSentenceFormat: string;
    ChangedOperationSentenceFormat: string;
    Operations: {
      ['Action_plural']: string;
      ['TriggerWithAction_plural']: string;
    };
    CheckActions: string;
  };
  UndoDialog: {
    Title: string;
    LearnMoreAriaLabel: string;
    SubTextFormat: string;
    WarningMessage: string;
    PrimaryButtonActionText: string;
    SecondaryButtonActionText: string;
  };
  PromptGuide: {
    Menu: {
      Title: string;
      Back: string;
      CreateFlow: string;
      AddAction: string;
      EditFlow: string;
      ExplainFlow: string;
      ReplaceAction: string;
      ExplainAction: string;
      AskQuestion: string;
      CreateFlowSubMenuItems: {
        Example1: string;
        Example2: string;
        Example3: string;
      };
    };
    Cards: {
      AddAction: {
        Title: string;
        Description: string;
      };
      ReplaceAction: {
        Title: string;
        Description: string;
      };
      EditFlow: {
        Title: string;
        Description: string;
      };
      Question: {
        Title: string;
        Description: string;
      };
    };
    QueryTemplates: {
      CreateFlow1SentenceStart: string;
      CreateFlow2SentenceStart: string;
      CreateFlow3SentenceStart: string;
      AddActionSentenceStart: string;
      ReplaceActionSentenceStartFormat: string;
      ExplainActionSentenceFormat: string;
      ExplainFlowSentence: string;
      QuestionSentenceStart: string;
      EditFlowSentenceStart: string;
    };
  };
  DevMode: {
    // These strings won't be localized.
    DevPill: string;
    ReportABug: string;
  };
  ThumbReaction: {
    Upvote: string;
    Downvote: string;
  };
  FeedbackCard: {
    PanelTitle: string;
    ThumbsDownLinkText: string;
    ThumbsUpLinkText: string;
  };
}
