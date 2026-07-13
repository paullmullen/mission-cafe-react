import React from "react";
import { Button, Card, Col, Row, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import ManagerGuard, {
  lockManagerSession,
} from "../components/manager/ManagerGuard";

const { Title, Paragraph } = Typography;

const ManagerHome = () => {
  const navigate = useNavigate();

  const lockTools = () => {
    lockManagerSession();
    navigate("/");
  };

  return (
    <ManagerGuard>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>
              Manager Tools
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Maintain recipes, inventory, categories, suppliers, and report recipients.
            </Paragraph>
          </div>

          <Button onClick={lockTools}>Lock Manager Tools</Button>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              title="Recipe Editor"
              actions={[
                <Link key="recipes" to="/manager/recipes">
                  Open Recipe Editor
                </Link>,
              ]}
            >
              Create and update recipes, ingredients, instructions, and images.
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              title="Inventory Editor"
              actions={[
                <span key="inventory" style={{ color: "#999" }}>
                  Coming next
                </span>,
              ]}
            >
              Maintain inventory items, categories, suppliers, and report recipients.
            </Card>
          </Col>
        </Row>
      </div>
    </ManagerGuard>
  );
};

export default ManagerHome;
