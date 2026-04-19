import { useMemo } from "react";
import { Card, Typography, Button, Flex, Space } from "antd";
import { CheckOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import type { StoreExpense } from "../../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { StatsGrid, StatCard, ClaimRow, Avatar, ClaimInfo, ClaimTypeBox, ClaimAmountBox } from "../ExpenseAdvancedTab.styled";

interface StaffClaimsTabProps {
  canModify: boolean;
  expenses?: StoreExpense[];
}

// Mock data for staff claims
const STAFF_CLAIMS = [
  {
    id: "1",
    employeeId: "emp_riya",
    name: "Riya Sharma",
    role: "Sales Associate",
    description: "Travel to warehouse",
    avatar: "RS",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    date: "11 Apr",
    category: "Travel",
    categoryColor: "#ea580c",
    categoryBg: "#fff7ed",
    amount: 320,
    status: "Pending",
    hasReceipt: true,
  },
  {
    id: "2",
    employeeId: "emp_arjun",
    name: "Arjun Kumar",
    role: "Store Manager",
    description: "Team lunch",
    avatar: "AK",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    date: "10 Apr",
    category: "Meals",
    categoryColor: "#9333ea",
    categoryBg: "#faf5ff",
    amount: 1800,
    status: "Pending",
    hasReceipt: true,
  },
  {
    id: "3",
    employeeId: "emp_priya",
    name: "Priya Desai",
    role: "Cashier",
    description: "Mobile recharge",
    avatar: "PD",
    gradient: "linear-gradient(135deg, #a855f7, #7c3aed)",
    date: "08 Apr",
    category: "Mobile",
    categoryColor: "#0891b2",
    categoryBg: "#ecfeff",
    amount: 1080,
    status: "Pending",
    hasReceipt: false,
  },
  {
    id: "4",
    employeeId: "emp_sameer",
    name: "Sameer Khan",
    role: "Delivery Staff",
    description: "Fuel reimbursement",
    avatar: "SK",
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    date: "07 Apr",
    category: "Fuel",
    categoryColor: "#ea0a36",
    categoryBg: "#ffe4e6",
    amount: 3200,
    status: "Approved",
    hasReceipt: true,
  },
];

const StaffClaimsTab = ({ canModify }: StaffClaimsTabProps) => {
  const { pendingCount, totalClaimed, approvedAmount, reimbursedAmount } = useMemo(() => {
    const pending = STAFF_CLAIMS.filter((c) => c.status === "Pending").length;
    const total = STAFF_CLAIMS.reduce((sum, c) => sum + c.amount, 0);
    const approved = STAFF_CLAIMS.filter((c) => c.status === "Approved").reduce(
      (sum, c) => sum + c.amount,
      0
    );

    return {
      pendingCount: pending,
      totalClaimed: total,
      approvedAmount: approved,
      reimbursedAmount: 0,
    };
  }, []);

  return (
    <>
      {/* Stats Grid */}
      <StatsGrid>
        <StatCard bg="#fef3c7" color="#d97706">
          <div>PENDING CLAIMS</div>
          <div>{pendingCount}</div>
        </StatCard>
        <StatCard bg="#fce7f3" color="#ec4899">
          <div>TOTAL CLAIMED</div>
          <div>{formatCurrency(totalClaimed)}</div>
        </StatCard>
        <StatCard bg="#dcfce7" color="#10b981">
          <div>APPROVED</div>
          <div>{formatCurrency(approvedAmount)}</div>
        </StatCard>
        <StatCard bg="#f3f4f6" color="#6b7280">
          <div>REIMBURSED</div>
          <div>{formatCurrency(reimbursedAmount)}</div>
        </StatCard>
      </StatsGrid>

      {/* Claims List */}
      <Card
        size="small"
        title={
          <Flex justify="space-between" align="center">
            <div>
              <Typography.Text strong>🧾 Staff Expense Claims</Typography.Text>
            </div>
            {canModify && (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => console.log("Add new claim")}>
                Submit Claim
              </Button>
            )}
          </Flex>
        }
      >
        {STAFF_CLAIMS.map((claim) => (
          <ClaimRow key={claim.id} approved={claim.status === "Approved"}>
            {/* Left: Avatar */}
            <Avatar gradient={claim.gradient}>{claim.avatar}</Avatar>

            {/* Left-Middle: Name & Meta */}
            <ClaimInfo>
              <div>{claim.name}</div>
              <div>
                {claim.role} · {claim.description} · {claim.date}
              </div>
            </ClaimInfo>

            {/* Middle: Category Badge */}
            <ClaimTypeBox bg={claim.categoryBg} color={claim.categoryColor}>
              <div>{claim.category}</div>
            </ClaimTypeBox>

            {/* Right: Amount & Status */}
            <ClaimAmountBox>
              <div>{formatCurrency(claim.amount)}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                {claim.hasReceipt ? "Receipt attached" : "No receipt"}
              </div>
            </ClaimAmountBox>

            {/* Right-Most: Status & Actions */}
            <Flex align="center" gap={8}>
              <Typography.Text
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: claim.status === "Pending" ? "#f59e0b" : "#10b981",
                }}
              >
                {claim.status}
              </Typography.Text>

              {claim.status === "Pending" && canModify && (
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined style={{ color: "#10b981", fontSize: "14px" }} />}
                    onClick={() => console.log("Approve:", claim.id)}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined style={{ color: "#ef4444", fontSize: "14px" }} />}
                    onClick={() => console.log("Reject:", claim.id)}
                  />
                </Space>
              )}

              {claim.status === "Approved" && (
                <Button type="primary" size="small">
                  Pay Now
                </Button>
              )}
            </Flex>
          </ClaimRow>
        ))}
      </Card>
    </>
  );
};

export default StaffClaimsTab;