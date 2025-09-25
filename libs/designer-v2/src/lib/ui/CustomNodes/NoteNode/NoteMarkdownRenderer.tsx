import ReactMarkdown from 'react-markdown';
import { useNoteNodeStyles } from './NoteNode.styles';
import { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';

const MarkdownRenderer = ({ content }: { content: string }) => {
  const styles = useNoteNodeStyles();

  const markdownRenderers = {
    img: (props: any) => <img {...props} className={styles.markdownImage} />,
    h1: (props: any) => <h1 {...props} className={styles.markdownHeading} />,
    h2: (props: any) => <h2 {...props} className={styles.markdownHeading} />,
    h3: (props: any) => <h3 {...props} className={styles.markdownHeading} />,
    h4: (props: any) => <h4 {...props} className={styles.markdownHeading} />,
    h5: (props: any) => <h5 {...props} className={styles.markdownHeading} />,
    h6: (props: any) => <h6 {...props} className={styles.markdownHeading} />,
    ul: (props: any) => <ul {...props} className={styles.markdownList} />,
    ol: (props: any) => <ol {...props} className={styles.markdownList} />,
    p: (props: any) => {
      // If the text content is just a YouTube link, render as an embed
      if (
        props.children.length === 1 &&
        typeof props.children[0] === 'string' &&
        props.children[0].startsWith('https://www.youtube.com/watch?v=')
      ) {
        return <YoutubeEmbed videoId={props.children[0].split('v=')[1]} />;
      }
      return <p {...props} className={styles.markdownParagraph} />;
    },
  };

  return (
    <ReactMarkdown className={styles.reactMarkdown} components={markdownRenderers}>
      {content}
    </ReactMarkdown>
  );
};

export default memo(MarkdownRenderer);

const YoutubeEmbed = ({ videoId }: { videoId: string }) => {
  const styles = useNoteNodeStyles();
  const intl = useIntl();

  const videoTitle = intl.formatMessage({
    defaultMessage: 'YouTube video player',
    id: 'tIl0ss',
    description: 'Title for YouTube video iframe',
  });

  const url = useMemo(() => {
    const _url = new URL(`https://www.youtube.com/embed/${videoId}`);
    _url.searchParams.set('enablejsapi', '1');
    return _url.toString();
  }, [videoId]);

  return <iframe title={videoTitle} className={styles.markdownEmbed} src={url} allowFullScreen />;
};
