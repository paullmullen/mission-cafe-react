import React from "react";
import { Button, Card, Col, Row, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import AdminGuard, { lockAdminSession } from "../components/admin/AdminGuard";

const { Title, Paragraph } = Typography;

const AdminHome = () => {
  const navigate = useNavigate();

  const lockAdmin = () => {
    lockAdminSession();
    navigate("/");
  };

  const cards = [
    {
      title: "Recipes",
      description: "Create and update recipes, ingredients, instructions, and images.",
      path: "/admin/recipes",
    },
    {
      title: "Inventory",
      description: "Maintain inventory items, categories, suppliers, and report recipients.",
      path: "/admin/inventory",
    },
    {
      title: "Maintenance",
      description: "Maintain recurring tasks, intervals, and instructions.",
      path: "/admin/maintenance",
    },
    {
      title: "Manager's Message",
      description: "Update the message displayed to café staff.",
      path: "/admin/message",
    },
    {
      title: "Menu Displays",
      description: "Upload and replace the menu display images.",
      path: "/admin/displays",
    },
  ];

  return (
    <AdminGuard>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
              Admin
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Maintain Mission Cafe content and configuration.
            </Paragraph>
          </div>

          <Button onClick={lockAdmin}>Lock Admin</Button>
        </div>

        <Row gutter={[16, 16]}>
          {cards.map((card) => (
            <Col xs={24} md={12} key={card.path}>
              <Card
                title={card.title}
                actions={[
                  <Link key={card.path} to={card.path}>
                    Open
                  </Link>,
                ]}
              >
                {card.description}
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </AdminGuard>
  );
};

export default AdminHome;
