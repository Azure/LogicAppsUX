import { memo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { Button, Card, Textarea } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

import type { AppDispatch } from '../../core';
import { deleteNote, updateNote } from '../../core/state/notes/notesSlice';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNote } from '../../core/state/notes/notesSelectors';

import {
	bundleIcon,
	DeleteFilled,
	DeleteRegular,
} from '@fluentui/react-icons';

const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);


const NoteNode = ({ id }: NodeProps) => {
	const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isReadOnly = useReadOnly();

	const noteData = useNote(id);

	const [isEditing, setIsEditing] = useState(false);

	const deleteCallback = useCallback(() => {
		if (isReadOnly) {
			return;
		}
		dispatch(deleteNote(id));
	}, [dispatch, id, isReadOnly]);

	// const resizeCallback = useCallback(({ width, height }: { width: number; height: number }) => {
	// 	if (isReadOnly) {
	// 		return;
	// 	}
	// 	dispatch(updateNote({ id, note: { metadata: { width, height } } }));
	// }, [dispatch, id, isReadOnly]);

	const placeholderText = intl.formatMessage({ 
		defaultMessage: 'This is a note. You can use **Markdown** to format the text.',
		id: 'RO1UJU',
		description: 'Placeholder text for an empty note node',
	});

	const markdownRenderers = {
		img(props: any) {
			return (
				<img
					alt={props.alt}
					src={props.src}
					title={props.title}
					style={{ maxWidth: '100%' }}
				/>
			);
		},
		p(props: any) {
			return (
				<p {...props} style={{ margin: 0}} />
			);
		}
	}

  return (
    <div
			style={{ zIndex: '-1' }}
			onDrag={(e) => {
				if (isEditing) {
					e.stopPropagation();
					e.preventDefault();
				}
			}}
		>
      <Card 
				onResize={(e) => console.log('#> resizing...', e)}
				style={{
					backgroundColor: noteData?.color || '#FFFBCC',
					boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',
					width: noteData?.metadata?.width || 200,
					height: noteData?.metadata?.height || 100,
					minWidth: 100,
					minHeight: 44,
					resize: isReadOnly ? 'none' : 'both',
				}}
			>
				{isEditing ? (
					<Textarea
						autoFocus
						placeholder={placeholderText}
						value={noteData?.content || ''}
						onChange={(e) => {
							if (isReadOnly) {
								return;
							}
							dispatch(updateNote({ id, note: { content: e.target.value } }));
						}}
						onBlur={() => setIsEditing(false)}
						onDrag={(e) => {
							e.stopPropagation();
							e.preventDefault();
						}}
						style={{
							width: '100%',
							height: '100%',
						}}
					/>
				) : (
					<div 
						onClick={(e: any) => {
							e.preventDefault();
							e.stopPropagation();
							if (isReadOnly) {
								return;
							}
							setIsEditing(true);
						}}
						style={{
							height: '100%',
							overflow: 'hidden',
							borderRadius: '4px',
						}}
					>
						<ReactMarkdown components={markdownRenderers}>
							{!isUndefinedOrEmptyString(noteData?.content)
								? noteData?.content 
								: `*${placeholderText}*`
							}
						</ReactMarkdown>
					</div>
				)}
			</Card>
			{!isReadOnly && (
				<div style={{
					position: 'absolute',
					bottom: '-40px',
					right: '0px',
				}}>
					<Button 
						icon={<DeleteIcon />} 
						onClick={deleteCallback}
						appearance="transparent"
					/>
				</div>
			)}
    </div>
  );
};

NoteNode.displayName = 'NoteNode';

export default memo(NoteNode);
