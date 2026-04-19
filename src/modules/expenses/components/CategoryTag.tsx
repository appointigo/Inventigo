/**
 * CategoryTag Component
 * Displays expense category with semantic colors from ColorService
 * Uses Ant Tag + Emotion styling for cleaner, maintainable code
 */

import styled from "@emotion/styled";
import { Tag } from "antd";
import { useExpenseColors } from "../hooks/useExpenseColors";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import { CloseOutlined } from "@ant-design/icons";

interface CategoryTagProps {
  category: ExpenseCategoryOption;
  usageCount?: number;
  canDelete?: boolean;
  onDelete?: (category: ExpenseCategoryOption) => void;
}

// Emotion styled components - cleaner, reusable, scoped
const StyledTagWrapper = styled.div<{ dotColor: string; textColor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .ant-tag {
    margin: 0;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }
  }
`;

const ColorDot = styled.span<{ color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${(props) => props.color};
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.15);
`;

const DeleteIcon = styled.span<{ textColor: string }>`
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.5;
  cursor: pointer;
  color: ${(props) => props.textColor};
  transition: all 0.2s ease;

  &:hover {
    opacity: 1;
    color: #ef4444;
  }
`;

export const CategoryTag = ({ category, usageCount, canDelete = false, onDelete }: CategoryTagProps) => {
  const { colors } = useExpenseColors(category.name);

  const label = (
    <>
      <ColorDot color={colors.dot} />
      {usageCount != null ? `${category.name} ${usageCount}x` : category.name}
      {canDelete && (
        <DeleteIcon
          textColor={colors.text}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(category);
          }}
        >
          <CloseOutlined />
        </DeleteIcon>
      )}
    </>
  );

  return (
    <StyledTagWrapper dotColor={colors.dot} textColor={colors.text}>
      <Tag
        style={{
          background: colors.bg,
          color: colors.text,
          border: `1.5px solid ${colors.border}`,
        }}
      >
        {label}
      </Tag>
    </StyledTagWrapper>
  );
};
