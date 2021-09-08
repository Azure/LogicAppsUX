import * as React from 'react';

interface PlusProps {
    fill: string;
}

// #0078D4 (light), #3AA0F3 (dark)
export function Plus({ fill }: PlusProps): JSX.Element {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.65625 6.34375H14V7.65625H7.65625V14H6.34375V7.65625H0V6.34375H6.34375V0H7.65625V6.34375Z" fill={fill} />
        </svg>
    );
}
