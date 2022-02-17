import { useEffect } from 'react';
import { useRemark } from 'react-remark';
import 'github-markdown-css/github-markdown-light.css';

export const Changelog = ({ changelog }: { changelog: string }) => {
  const [reactContent, setMarkdownSource] = useRemark();
  useEffect(() => {
    setMarkdownSource(changelog);
  }, [changelog, setMarkdownSource]);
  return <div className="markdown-body p-10">{reactContent}</div>;
};
