import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
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
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const { Title, Text } = Typography;
const { TextArea } = Input;

const blankInstruction = () => ({ type: "text", text: "" });
const blankTask = () => ({
  name: "",
  intervalDays: 30,
  instructions: [blankInstruction()],
});

const normalizeTask = (id, data = {}) => ({
  id,
  name: data.name || "",
  intervalDays: Number(data.intervalDays || 0),
  instructions:
    Array.isArray(data.instructions) && data.instructions.length
      ? data.instructions.map((item) => ({
          type: item?.type || "text",
          text: item?.text || "",
        }))
      : [blankInstruction()],
  completed: Array.isArray(data.completed) ? data.completed : [],
});

const MaintenanceAdmin = () => {
  const [form] = Form.useForm();
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef(null);
  const listScrollRef = useRef(null);
  const pendingScrollTopRef = useRef(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedId) || null,
    [tasks, selectedId]
  );

  const filteredTasks = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return needle
      ? tasks.filter((task) => task.name.toLowerCase().includes(needle))
      : tasks;
  }, [tasks, searchText]);

  const loadTasks = async (preferredId = null) => {
    if (listScrollRef.current) {
      pendingScrollTopRef.current = listScrollRef.current.scrollTop;
    }

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "maintenance"));
      const loaded = snapshot.docs
        .map((taskDoc) => normalizeTask(taskDoc.id, taskDoc.data()))
        .sort((a, b) => a.name.localeCompare(b.name));

      setTasks(loaded);
      const nextId =
        preferredId && loaded.some((task) => task.id === preferredId)
          ? preferredId
          : loaded[0]?.id || null;
      setSelectedId(nextId);
      form.setFieldsValue(
        nextId ? loaded.find((task) => task.id === nextId) : blankTask()
      );
      setDirty(false);

      window.requestAnimationFrame(() => {
        if (listScrollRef.current && pendingScrollTopRef.current !== null) {
          listScrollRef.current.scrollTop = pendingScrollTopRef.current;
          pendingScrollTopRef.current = null;
        }
      });
    } catch (error) {
      console.error(error);
      message.error("Maintenance tasks could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTask = (task) => {
    const open = () => {
      setSelectedId(task.id);
      form.setFieldsValue(task);
      setDirty(false);
      if (window.innerWidth < 992) {
        setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      }
    };
    if (!dirty) return open();
    Modal.confirm({
      title: "Discard unsaved changes?",
      content: "Your unsaved changes will be lost.",
      okText: "Discard Changes",
      cancelText: "Keep Editing",
      okButtonProps: { danger: true },
      onOk: open,
    });
  };

  const startNewTask = () => {
    setSelectedId(null);
    form.resetFields();
    form.setFieldsValue(blankTask());
    setDirty(false);
  };

  const cleanValues = (values) => ({
    name: values.name.trim(),
    intervalDays: Number(values.intervalDays || 0),
    instructions: (values.instructions || []).map((item) => ({
      type: item?.type || "text",
      text: item?.text || "",
    })),
  });

  const saveTask = async () => {
    try {
      const values = await form.validateFields();
      const payload = cleanValues(values);
      setSaving(true);
      if (selectedId) {
        await updateDoc(doc(db, "maintenance", selectedId), payload);
        message.success("Maintenance task saved.");
        await loadTasks(selectedId);
      } else {
        const newDoc = await addDoc(collection(db, "maintenance"), {
          ...payload,
          completed: [],
        });
        message.success("Maintenance task created.");
        await loadTasks(newDoc.id);
      }
    } catch (error) {
      if (!error?.errorFields) console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const duplicateTask = async () => {
    const values = await form.validateFields();
    const payload = cleanValues(values);
    const newDoc = await addDoc(collection(db, "maintenance"), {
      ...payload,
      name: `${payload.name} Copy`,
      completed: [],
    });
    message.success("Maintenance task duplicated.");
    await loadTasks(newDoc.id);
  };

  const removeTask = () => {
    if (!selectedId || !selectedTask) return;
    Modal.confirm({
      title: `Delete "${selectedTask.name}"?`,
      content: selectedTask.completed.length
        ? `This also deletes ${selectedTask.completed.length} completion history entries.`
        : "This permanently deletes the maintenance task.",
      okText: "Delete Task",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteDoc(doc(db, "maintenance", selectedId));
        message.success("Maintenance task deleted.");
        await loadTasks();
      },
    });
  };

  const moveInstruction = (fromIndex, toIndex) => {
    const instructions = form.getFieldValue("instructions") || [];
    if (toIndex < 0 || toIndex >= instructions.length) return;
    const reordered = [...instructions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    form.setFieldValue("instructions", reordered);
    setDirty(true);
  };

  const actions = (
    <Space wrap>
      <Button type="primary" loading={saving} onClick={saveTask}>
        {selectedId ? "Save Task" : "Create Task"}
      </Button>
      <Button onClick={duplicateTask}>Duplicate</Button>
      <Button danger disabled={!selectedId} onClick={removeTask}>Delete Task</Button>
    </Space>
  );

  if (loading) return <div style={{ padding: 48, textAlign: "center" }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Title level={2} style={{ marginBottom: 4 }}>Maintenance Setup</Title>
      <Text type="secondary">Configure maintenance tasks, intervals, and instructions.</Text>

      <Row gutter={[20, 20]} align="top" style={{ marginTop: 20 }}>
        <Col xs={24} lg={8}>
          <Card title="Maintenance Tasks" extra={<Button type="primary" onClick={startNewTask}>New Task</Button>}>
            <div ref={listScrollRef} style={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto", paddingRight: 4 }}>
              <Input.Search allowClear placeholder="Search tasks" value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ marginBottom: 12 }} />
              {filteredTasks.length ? (
                <List size="small" dataSource={filteredTasks} renderItem={(task) => (
                  <List.Item onClick={() => openTask(task)} style={{ cursor: "pointer", padding: "10px 12px", borderRadius: 6, background: task.id === selectedId ? "#e6f4ff" : "transparent" }}>
                    <div><Text strong={task.id === selectedId}>{task.name}</Text><br /><Text type="secondary">Every {task.intervalDays} day(s)</Text></div>
                  </List.Item>
                )} />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <div ref={editorRef} style={{ position: "sticky", top: 84, scrollMarginTop: 84 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>{selectedId ? "Edit Maintenance Task" : "New Maintenance Task"}</Title>
                  {selectedTask && <Text type="secondary">{selectedTask.completed.length} completion history entries</Text>}
                </div>
                {actions}
              </div>
              <Divider />

              <Form form={form} layout="vertical" initialValues={blankTask()} onValuesChange={() => setDirty(true)}>
                <Row gutter={16}>
                  <Col xs={24} md={16}>
                    <Form.Item label="Task Name" name="name" rules={[{ required: true, whitespace: true, message: "Enter a task name." }]}><Input /></Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Interval (Days)" name="intervalDays" rules={[{ required: true, message: "Enter an interval." }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">Instructions</Divider>
                <Form.List name="instructions">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      {fields.map((field, index) => (
                        <Card key={field.key} size="small" title={`Instruction ${index + 1}`} extra={
                          <Space wrap>
                            <Button size="small" disabled={index === 0} onClick={() => moveInstruction(index, index - 1)}>Up</Button>
                            <Button size="small" disabled={index === fields.length - 1} onClick={() => moveInstruction(index, index + 1)}>Down</Button>
                            <Button size="small" danger onClick={() => remove(field.name)}>Delete</Button>
                          </Space>
                        }>
                          <Form.Item label="Type" name={[field.name, "type"]} rules={[{ required: true }]}>
                            <Radio.Group><Radio.Button value="text">Text</Radio.Button><Radio.Button value="image">Image</Radio.Button></Radio.Group>
                          </Form.Item>
                          <Form.Item shouldUpdate noStyle>
                            {() => {
                              const type = form.getFieldValue(["instructions", field.name, "type"]) || "text";
                              return (
                                <Form.Item label={type === "image" ? "Image URL" : "Instruction"} name={[field.name, "text"]} rules={[{ required: true, whitespace: true }]}>
                                  {type === "image" ? <Input placeholder="https://..." /> : <TextArea autoSize={{ minRows: 2, maxRows: 8 }} />}
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                          <Form.Item shouldUpdate noStyle>
                            {() => {
                              const type = form.getFieldValue(["instructions", field.name, "type"]);
                              const url = form.getFieldValue(["instructions", field.name, "text"]);
                              return type === "image" && url ? <Image src={url} alt={`Instruction ${index + 1}`} width={240} style={{ maxHeight: 220, objectFit: "contain" }} /> : null;
                            }}
                          </Form.Item>
                        </Card>
                      ))}
                      <Button type="dashed" block onClick={() => add(blankInstruction())}>Add Instruction</Button>
                    </Space>
                  )}
                </Form.List>
                <Divider />
                {actions}
              </Form>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default MaintenanceAdmin;
