import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Radio,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const { Title, Text } = Typography;
const { TextArea } = Input;

const blankItem = (category = "Opening", subCategory = "") => ({
  category,
  subCategory,
  text: "",
  order: "",
  complete: false,
});

const normalizeItem = (id, data = {}) => ({
  id,
  category: data.category || "Opening",
  subCategory: data.subCategory || data.category || "",
  text: data.text || "",
  order: String(data.order || ""),
  complete: Boolean(data.complete),
});

const nextOrderValue = (items) => {
  if (!items.length) return "0100";

  const numericOrders = items
    .map((item) => Number.parseInt(item.order, 10))
    .filter(Number.isFinite);

  if (!numericOrders.length) return String((items.length + 1) * 100).padStart(4, "0");

  return String(Math.max(...numericOrders) + 100).padStart(4, "0");
};

const ChecklistAdmin = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Opening");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);
  const listScrollRef = useRef(null);
  const pendingScrollTopRef = useRef(null);

  const loadItems = async (preferredId = null) => {
    if (listScrollRef.current) {
      pendingScrollTopRef.current = listScrollRef.current.scrollTop;
    }

    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "checklists"));
      const loaded = snapshot.docs
        .map((itemDoc) => normalizeItem(itemDoc.id, itemDoc.data()))
        .sort((a, b) => {
          const categoryCompare = a.category.localeCompare(b.category);
          if (categoryCompare) return categoryCompare;

          const subCompare = a.subCategory.localeCompare(b.subCategory);
          if (subCompare) return subCompare;

          return a.order.localeCompare(b.order);
        });

      setItems(loaded);

      const nextId =
        preferredId && loaded.some((item) => item.id === preferredId)
          ? preferredId
          : loaded.find((item) => item.category === activeCategory)?.id || null;

      setSelectedId(nextId);

      if (nextId) {
        form.setFieldsValue(loaded.find((item) => item.id === nextId));
      } else {
        form.setFieldsValue(blankItem(activeCategory));
      }

      window.requestAnimationFrame(() => {
        if (
          listScrollRef.current &&
          pendingScrollTopRef.current !== null
        ) {
          listScrollRef.current.scrollTop = pendingScrollTopRef.current;
          pendingScrollTopRef.current = null;
        }
      });
    } catch (error) {
      console.error(error);
      message.error("Checklist items could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const firstItem = items.find((item) => item.category === activeCategory);

    if (firstItem) {
      setSelectedId(firstItem.id);
      form.setFieldsValue(firstItem);
    } else {
      setSelectedId(null);
      form.setFieldsValue(blankItem(activeCategory));
    }
  }, [activeCategory, form, items]);

  const categoryItems = useMemo(
    () =>
      items
        .filter((item) => item.category === activeCategory)
        .sort((a, b) => {
          const subCompare = a.subCategory.localeCompare(b.subCategory);
          return subCompare || a.order.localeCompare(b.order);
        }),
    [activeCategory, items]
  );

  const subsectionNames = useMemo(
    () => [...new Set(categoryItems.map((item) => item.subCategory).filter(Boolean))],
    [categoryItems]
  );

  const groupedItems = useMemo(
    () =>
      subsectionNames.map((subCategory) => ({
        subCategory,
        items: categoryItems
          .filter((item) => item.subCategory === subCategory)
          .sort((a, b) => a.order.localeCompare(b.order)),
      })),
    [categoryItems, subsectionNames]
  );

  const openItem = (item) => {
    setSelectedId(item.id);
    form.setFieldsValue(item);

    if (window.innerWidth < 992) {
      window.setTimeout(() => {
        editorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }
  };

  const newItem = (subCategory = "") => {
    const itemsInSubsection = categoryItems.filter(
      (item) => item.subCategory === subCategory
    );

    setSelectedId(null);
    form.resetFields();
    form.setFieldsValue({
      ...blankItem(activeCategory, subCategory),
      order: nextOrderValue(itemsInSubsection),
    });
  };

  const saveItem = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        category: values.category,
        subCategory: values.subCategory.trim(),
        text: values.text.trim(),
        order: String(values.order || "").trim(),
      };

      setSaving(true);

      if (selectedId) {
        await updateDoc(doc(db, "checklists", selectedId), payload);
        message.success("Checklist item saved.");
        await loadItems(selectedId);
      } else {
        const newDoc = await addDoc(collection(db, "checklists"), {
          ...payload,
          complete: false,
        });
        message.success("Checklist item created.");
        await loadItems(newDoc.id);
      }
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error("The checklist item could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateItem = async () => {
    try {
      const values = await form.validateFields();
      const sameSubsection = categoryItems.filter(
        (item) => item.subCategory === values.subCategory
      );

      const newDoc = await addDoc(collection(db, "checklists"), {
        category: values.category,
        subCategory: values.subCategory.trim(),
        text: `${values.text.trim()} Copy`,
        order: nextOrderValue(sameSubsection),
        complete: false,
      });

      message.success("Checklist item duplicated.");
      await loadItems(newDoc.id);
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error("The checklist item could not be duplicated.");
    }
  };

  const removeItem = () => {
    if (!selectedId) return;

    const currentItem = items.find((item) => item.id === selectedId);

    Modal.confirm({
      title: "Delete checklist item?",
      content: currentItem?.text || "This item will be permanently deleted.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, "checklists", selectedId));
        message.success("Checklist item deleted.");
        await loadItems();
      },
    });
  };

  const addSubsection = () => {
    let subsectionName = "";

    Modal.confirm({
      title: `New ${activeCategory} Subsection`,
      content: (
        <Input
          autoFocus
          placeholder="Subsection name"
          onChange={(event) => {
            subsectionName = event.target.value;
          }}
        />
      ),
      okText: "Continue",
      onOk: () => {
        const trimmed = subsectionName.trim();

        if (!trimmed) {
          message.warning("Enter a subsection name.");
          return Promise.reject();
        }

        if (
          subsectionNames.some(
            (name) => name.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          message.warning("That subsection already exists.");
          return Promise.reject();
        }

        newItem(trimmed);
        message.info("Add the first item and save it to create the subsection.");
      },
    });
  };

  const renameSubsection = (oldName) => {
    let nextName = oldName;

    Modal.confirm({
      title: `Rename "${oldName}"`,
      content: (
        <Input
          defaultValue={oldName}
          onChange={(event) => {
            nextName = event.target.value;
          }}
        />
      ),
      okText: "Rename",
      onOk: async () => {
        const trimmed = nextName.trim();
        if (!trimmed) return Promise.reject();

        const affected = categoryItems.filter(
          (item) => item.subCategory === oldName
        );

        await Promise.all(
          affected.map((item) =>
            updateDoc(doc(db, "checklists", item.id), {
              subCategory: trimmed,
            })
          )
        );

        await loadItems(selectedId);
        message.success("Subsection renamed.");
      },
    });
  };

  const deleteSubsection = (subCategory) => {
    const affected = categoryItems.filter(
      (item) => item.subCategory === subCategory
    );

    if (affected.length > 0) {
      message.warning(
        `Move or delete the ${affected.length} item(s) in this subsection first.`
      );
      return;
    }
  };

  const moveItem = async (item, direction) => {
    const subsectionItems = categoryItems
      .filter((candidate) => candidate.subCategory === item.subCategory)
      .sort((a, b) => a.order.localeCompare(b.order));

    const currentIndex = subsectionItems.findIndex(
      (candidate) => candidate.id === item.id
    );
    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= subsectionItems.length) return;

    const reordered = [...subsectionItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const batch = writeBatch(db);

    reordered.forEach((candidate, index) => {
      batch.update(doc(db, "checklists", candidate.id), {
        order: String((index + 1) * 100).padStart(4, "0"),
      });
    });

    await batch.commit();
    await loadItems(item.id);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const collapseItems = groupedItems.map(({ subCategory, items: subsectionItems }) => ({
    key: subCategory,
    label: <Text strong>{subCategory}</Text>,
    extra: (
      <Space
        wrap
        onClick={(event) => event.stopPropagation()}
      >
        <Button size="small" onClick={() => newItem(subCategory)}>
          Add Item
        </Button>
        <Button size="small" onClick={() => renameSubsection(subCategory)}>
          Rename
        </Button>
        <Button
          size="small"
          danger
          onClick={() => deleteSubsection(subCategory)}
        >
          Delete
        </Button>
      </Space>
    ),
    children: (
      <List
        size="small"
        dataSource={subsectionItems}
        renderItem={(item, index) => (
          <List.Item
            onClick={() => openItem(item)}
            style={{
              cursor: "pointer",
              padding: "10px 12px",
              borderRadius: 6,
              background:
                item.id === selectedId ? "#e6f4ff" : "transparent",
            }}
            actions={[
              <Button
                key="up"
                size="small"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  moveItem(item, -1);
                }}
              >
                Up
              </Button>,
              <Button
                key="down"
                size="small"
                disabled={index === subsectionItems.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  moveItem(item, 1);
                }}
              >
                Down
              </Button>,
            ]}
          >
            <Text>{item.text}</Text>
          </List.Item>
        )}
      />
    ),
  }));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          Checklist Setup
        </Title>
        <Text type="secondary">
          Configure opening and closing checklist sections and items.
        </Text>
      </div>

      <Radio.Group
        value={activeCategory}
        onChange={(event) => setActiveCategory(event.target.value)}
        buttonStyle="solid"
        style={{ marginBottom: 20 }}
      >
        <Radio.Button value="Opening">Opening</Radio.Button>
        <Radio.Button value="Closing">Closing</Radio.Button>
      </Radio.Group>

      <Row gutter={[20, 20]} align="top">
        <Col xs={24} lg={10}>
          <Card
            title={`${activeCategory} Checklist`}
            extra={
              <Space>
                <Button onClick={addSubsection}>New Subsection</Button>
                <Button type="primary" onClick={() => newItem()}>
                  New Item
                </Button>
              </Space>
            }
          >
            <div
              ref={listScrollRef}
              style={{
                maxHeight: "calc(100vh - 285px)",
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {collapseItems.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Add a subsection or checklist item"
                />
              ) : (
                <Collapse
                  items={collapseItems}
                  defaultActiveKey={collapseItems.map((item) => item.key)}
                />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <div
            ref={editorRef}
            style={{
              position: "sticky",
              top: 84,
              scrollMarginTop: 84,
            }}
          >
            <Card>
              <Title level={3} style={{ marginTop: 0 }}>
                {selectedId ? "Edit Checklist Item" : "New Checklist Item"}
              </Title>

              <Form form={form} layout="vertical">
                <Form.Item
                  label="Checklist"
                  name="category"
                  rules={[{ required: true }]}
                >
                  <Radio.Group>
                    <Radio.Button value="Opening">Opening</Radio.Button>
                    <Radio.Button value="Closing">Closing</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="Subsection"
                  name="subCategory"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Enter a subsection.",
                    },
                  ]}
                >
                  <Input placeholder="Opening, Pre-Close, After Close..." />
                </Form.Item>

                <Form.Item
                  label="Checklist Item"
                  name="text"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Enter the checklist text.",
                    },
                  ]}
                >
                  <TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
                </Form.Item>

                {/* <Form.Item
                  label="Order"
                  name="order"
                  extra="Stored as text, matching the current checklist data."
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Enter an order value.",
                    },
                  ]}
                >
                  <Input placeholder="0100" />
                </Form.Item> */}

                <Divider />

                <Space wrap>
                  <Button
                    type="primary"
                    loading={saving}
                    onClick={saveItem}
                  >
                    {selectedId ? "Save Item" : "Create Item"}
                  </Button>
                  <Button onClick={duplicateItem}>Duplicate</Button>
                  <Button
                    danger
                    disabled={!selectedId}
                    onClick={removeItem}
                  >
                    Delete
                  </Button>
                </Space>
              </Form>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ChecklistAdmin;
