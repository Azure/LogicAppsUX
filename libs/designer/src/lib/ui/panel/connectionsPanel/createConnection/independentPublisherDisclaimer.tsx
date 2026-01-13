import { Link, Text } from "@fluentui/react-components";
import { useIntl } from "react-intl";
import { makeStyles, tokens } from "@fluentui/react-components";

const CERTIFICATION_DOCS_URL =
  "https://learn.microsoft.com/en-us/connectors/custom-connectors/submit-certification";
const MIT_LICENSE_URL = "https://mit-license.org/";

const useStyles = makeStyles({
  disclaimerContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderLeft: `3px solid ${tokens.colorBrandBackground}`,
    marginTop: "12px",
    marginBottom: "12px",
  },
  disclaimerText: {
    lineHeight: "20px",
  },
  licenseText: {
    marginTop: "8px",
  },
  boldText: {
    fontWeight: tokens.fontWeightSemibold,
  },
});

export interface IndependentPublisherDisclaimerProps {
  /** The text to use for the create button (e.g., "Create", "Sign in") */
  createButtonText?: string;
}

/**
 * Displays a disclaimer for Independent Publisher connectors.
 * This component shows a warning about the risks of using Independent Publisher connectors
 * and requires users to agree to the MIT License before creating a connection.
 */
export const IndependentPublisherDisclaimer = ({
  createButtonText,
}: IndependentPublisherDisclaimerProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const disclaimerText = intl.formatMessage({
    defaultMessage:
      'Independent Publisher Connectors are developed and maintained by Independent Publishers. Independent Publisher Connectors are provided "as is" without warranty and are not supported by Microsoft or the underlying external service behind the connector. Only create a connection to an Independent Publisher Connector if you trust the publisher and source as the Independent Publisher Connector could introduce security or privacy risks.',
    id: "Zy3pN7",
    description:
      "Disclaimer text for Independent Publisher connectors warning about risks",
  });

  const learnMoreText = intl.formatMessage({
    defaultMessage: "Learn more",
    id: "k8bFVo",
    description:
      "Link text to learn more about Independent Publisher connectors",
  });

  const buttonText =
    createButtonText ??
    intl.formatMessage({
      defaultMessage: "Create",
      id: "VzzYJk",
      description: "Default create button text for license agreement",
    });

  const bySelectingText = intl.formatMessage({
    defaultMessage: "By selecting",
    id: "xK7mNp",
    description: "Text before the button name in license agreement",
  });

  const youAgreeToTheText = intl.formatMessage({
    defaultMessage: "you agree to the",
    id: "qR9sLw",
    description: "Text between button name and license link",
  });

  return (
    <div className={styles.disclaimerContainer}>
      <Text className={styles.disclaimerText}>
        {disclaimerText}{" "}
        <Link
          href={CERTIFICATION_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          inline
        >
          {learnMoreText}
        </Link>
      </Text>
      <Text className={styles.licenseText}>
        {bySelectingText} <span className={styles.boldText}>{buttonText}</span>{" "}
        {youAgreeToTheText}{" "}
        <Link
          href={MIT_LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          inline
        >
          MIT License
        </Link>
        .
      </Text>
    </div>
  );
};
