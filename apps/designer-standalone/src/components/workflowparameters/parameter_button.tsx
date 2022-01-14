import styles from './parameter_button.module.less';

export interface ParameterButtonProps {
    toggleOpen: (res: boolean) => void;
}
export const ParameterButton = (props: ParameterButtonProps) => {
    return (
        <div>
            <div role="button" className={styles.nub} onClick={() => props.toggleOpen(true)}>
                <div aria-label="Parameter_Button">
                    openParameters
                </div>
            </div>
        </div>
    );
};
