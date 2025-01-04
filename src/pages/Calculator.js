import React, { useState } from "react";
import { Table, Input, Row, Col, Button } from "antd";
import styled from "styled-components";

// Currency data
const currencyData = [
  { name: "Hundreds", value: 100 },
  { name: "Fifties", value: 50 },
  { name: "Twenties", value: 20 },
  { name: "Tens", value: 10 },
  { name: "Fives", value: 5 },
  { name: "Twos", value: 2 },
  { name: "Ones", value: 1 },
  { name: "Half Dollars", value: 0.5 },
  { name: "Quarters", value: 0.25 },
  { name: "Rolled Quarters", value: 10 },
  { name: "Dimes", value: 0.1 },
  { name: "Rolled Dimes", value: 5 },
  { name: "Nickles", value: 0.05 },
  { name: "Rolled Nickles", value: 2 },
  { name: "Pennies", value: 0.01 },
  { name: "Rolled Pennies", value: 0.5 },
];

// Styled Components
const CalculatorContainer = styled.div`
  padding: 16px;
  font-size: 2rem;
`;

const TableWrapper = styled.div`
  margin-bottom: 20px;
`;

const TotalWrapper = styled(Row)`
  margin-top: 12px;
  font-size: 18px;
  font-weight: bold;
`;

const ClearButtonWrapper = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
`;

const Calculator = () => {
  const [counts, setCounts] = useState(
    currencyData.reduce((acc, currency) => {
      acc[currency.name] = 0;
      return acc;
    }, {})
  );

  const handleChange = (e, currencyName) => {
    const newCount = e.target.value ? parseInt(e.target.value, 10) : 0;
    setCounts((prevCounts) => ({
      ...prevCounts,
      [currencyName]: newCount,
    }));
  };

  const handleClear = () => {
    // Reset all counts to 0
    const resetCounts = currencyData.reduce((acc, currency) => {
      acc[currency.name] = 0;
      return acc;
    }, {});
    setCounts(resetCounts);
  };

  const columns = [
    {
      title: "Currency",
      dataIndex: "name",
      key: "name",
      render: (text) => <span style={{ fontSize: "1.5rem" }}>{text}</span>,
      align: "left",
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      render: (text, record) => (
        <Input
          type="number"
          value={counts[record.name]}
          onChange={(e) => handleChange(e, record.name)}
          min={0}
          style={{ width: "80px", textAlign: "right", fontSize: "1.5rem" }}
        />
      ),
      align: "right",
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      render: (text, record) => {
        const totalValue = counts[record.name] * record.value;
        return (
          <span style={{ textAlign: "right", fontSize: "1.5rem" }}>
            ${totalValue.toFixed(2)}
          </span>
        );
      },
      align: "right",
    },
  ];

  const totalAmount = currencyData.reduce((total, currency) => {
    return total + counts[currency.name] * currency.value;
  }, 0);

  return (
    <CalculatorContainer>
      <TableWrapper>
        <Table
          dataSource={currencyData}
          columns={columns}
          rowKey="name"
          pagination={false}
          bordered
          size="small"
        />
      </TableWrapper>

      <TotalWrapper>
        <Col span={12}>Total Value:</Col>
        <Col span={12} style={{ textAlign: "right" }}>
          ${totalAmount.toFixed(2)}
        </Col>
      </TotalWrapper>

      <ClearButtonWrapper>
        <Button onClick={handleClear} type="default">
          Clear
        </Button>
      </ClearButtonWrapper>
    </CalculatorContainer>
  );
};

export default Calculator;
