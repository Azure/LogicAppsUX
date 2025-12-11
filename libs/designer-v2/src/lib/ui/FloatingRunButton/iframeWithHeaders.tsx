/* eslint-disable no-undef */
import React, { useEffect } from 'react';

export const IFrameWithHeaders = (props: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { src, headers, ...nonSrcProps } = props;

  const [srcDoc, setSrcDoc] = React.useState<string>('');
  useEffect(() => {
    const method = 'GET';
    const headers = new Headers({ ...props.headers });
    const options = { method, headers };

    fetch(src, options)
      .then((response) => response.text())
      .then((response) => setSrcDoc(response));
  }, [props.headers, src]);

  return <iframe srcDoc={srcDoc} {...nonSrcProps} />;
};
