/// <reference types="react" />
export interface CategoryCardProps {
    categoryKey: string;
    categoryTitle: string;
    categoryDescription: string;
    icon: React.ReactNode;
    isCategory?: boolean;
    onCategoryClick: (categoryKey: string) => void;
}
export declare const CategoryCard: ({ categoryKey, categoryTitle, categoryDescription, icon, isCategory, onCategoryClick, }: CategoryCardProps) => import("react/jsx-runtime").JSX.Element;
