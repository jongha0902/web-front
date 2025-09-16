import React, { useCallback, useImperativeHandle, useRef, forwardRef, useState, useMemo } from 'react';
import ReactFlow, { MiniMap, Controls, Background, addEdge, useNodesState, useEdgesState, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { nanoid } from 'nanoid';
import { EdgeColorModal, CustomGroup, SquareNode, CircleNode, ConditionNode, TableNode } from './CustomNodes';

const FlowEditor = forwardRef(({ isReadOnly = false }, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [edgeColorModalOpen, setEdgeColorModalOpen] = useState(false);
  const selectedEdgeIdRef = useRef(null);

  // ✅ nodeTypes는 useMemo로 고정
  const nodeTypes = useMemo(() => ({
    customGroup: (props) => (<CustomGroup {...props} width={props.width || 320} height={props.height || 200} setNodes={setNodes} />),
    table: TableNode,
    square: SquareNode,
    circle: CircleNode,
    condition: ConditionNode,
  }), [setNodes]);  // 의존성에 setNodes만 넣으면 됨

  const updateNodeLabel = (id, newLabel) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label: newLabel,
                setLabel: updateNodeLabel,
                setColumns: updateNodeColumns,
                readOnly: isReadOnly,
              },
            }
          : node
      )
    );
  };

  const updateNodeColumns = (id, newColumns) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                columns: newColumns,
                setLabel: updateNodeLabel,
                setColumns: updateNodeColumns,
                readOnly: isReadOnly,
              },
            }
          : node
      )
    );
  };

  const createNode = (type) => {
    const newNode = {
      id: nanoid(),
      type,
      position: { x: Math.random() * 600, y: Math.random() * 400 },
      draggable: !isReadOnly,
      connectable: !isReadOnly,
      ...(type === 'customGroup' ? {
        style: { width: 320, height: 200 }
      } : {}),
      data: {
        label: `${type} 노드명`,
        width: 320,
        height: 200,
        setLabel: updateNodeLabel,
        setColumns: updateNodeColumns,
        readOnly: isReadOnly,
      },
    };
  
    setNodes((nds) => {
      if (type === 'customGroup') {
        return [newNode, ...nds];
      } else {
        return [...nds, newNode];
      }
    });
  };

  const getPositionFromHandleId = (handleId) => {
    switch (handleId) {
      case 'top': return Position.Top;
      case 'bottom': return Position.Bottom;
      case 'left': return Position.Left;
      case 'right': return Position.Right;
      default: return Position.Right;
    }
  };

  const onConnect = useCallback(
    (params) => {
      const sourcePos = getPositionFromHandleId(params.sourceHandle);
      const targetPos = getPositionFromHandleId(params.targetHandle);

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            sourcePosition: sourcePos,
            targetPosition: targetPos,
            animated: true,
            style: {
              stroke: '#999999',
              strokeWidth: 3,
              cursor: 'pointer',
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodesChangeWithGrouping = useCallback((changes) => {
    let deltaByGroupId = {}; // 그룹 이동 추적용
  
    setNodes((prevNodes) => {
      let nextNodes = [...prevNodes];
      const groupNodes = prevNodes.filter((n) => n.type === 'customGroup');
  
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const movingNode = nextNodes.find((n) => n.id === change.id);
          if (!movingNode) return;
  
          // 그룹이면 자식들도 이동
          if (movingNode.type === 'customGroup') {
            const oldX = movingNode.position.x;
            const oldY = movingNode.position.y;
            const newX = change.position.x;
            const newY = change.position.y;
  
            const deltaX = newX - oldX;
            const deltaY = newY - oldY;
            deltaByGroupId[movingNode.id] = { deltaX, deltaY };
          } else {
            // 그룹 안에 포함되는지 확인
            const nodeX = change.position.x;
            const nodeY = change.position.y;
  
            const foundGroup = groupNodes.find((g) => {
              const gx = g.position.x;
              const gy = g.position.y;
              const gw = g.data.width;
              const gh = g.data.height;
              return (
                nodeX >= gx &&
                nodeY >= gy &&
                nodeX <= gx + gw &&
                nodeY <= gy + gh
              );
            });
  
            // 그룹 포함 처리
            nextNodes = nextNodes.map((n) => {
              if (n.id === change.id) {
                return {
                  ...n,
                  parentGroupId: foundGroup?.id || null,
                };
              }
              return n;
            });
          }
        }
      });
  
      // 자식 노드 이동 반영
      if (Object.keys(deltaByGroupId).length > 0) {
        nextNodes = nextNodes.map((node) => {
          const groupId = node.parentGroupId;
          if (groupId && deltaByGroupId[groupId]) {
            const { deltaX, deltaY } = deltaByGroupId[groupId];
            return {
              ...node,
              position: {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY,
              },
            };
          }
          return node;
        });
      }
  
      // 그룹 노드의 data.children 업데이트
      nextNodes = nextNodes.map((node) => {
        if (node.type !== 'customGroup') return node;
  
        const children = nextNodes
          .filter((n) => n.parentGroupId === node.id)
          .map((n) => n.id);
  
        return {
          ...node,
          data: {
            ...node.data,
            children,
          },
        };
      });
  
      return nextNodes;
    });
  
    // 기존 변화 처리도 실행
    onNodesChange(changes);
  }, [onNodesChange, setNodes]);

  useImperativeHandle(ref, () => ({
    setResetEdge: () => {
      resetEdgeStyles();
    },
    getFlow: () => ({ nodes, edges }),
    clearFlow: () => {
      setNodes([]);
      setEdges([]);
    },
    setFlow: (data) => {
      const loadedNodes = (data.nodes || []).map((node) => ({
        ...node,
        data: {
          ...node.data,
          setLabel: updateNodeLabel,
          setColumns: updateNodeColumns,
          readOnly: isReadOnly,
        },
        draggable: !isReadOnly,
        connectable: !isReadOnly,
        selected: false,
      }));
      setNodes(loadedNodes);
      setEdges(
        (data.edges || []).map((e) => ({
          ...e,
          sourcePosition: e.sourcePosition || Position.Right,  // 👉 저장된 값이 있으면 유지
          targetPosition: e.targetPosition || Position.Left,
          style: {
            stroke: e.style?.stroke || '#999999',
            strokeWidth: e.style?.strokeWidth || 3,
            cursor: 'pointer',
          },
        }))
      );
    },
  }));

  const resetEdgeStyles = () => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...(e.style || {}),
          strokeWidth: 3,
        },
      }))
    );
  };

  const onEdgeClick = (event, edge) => {
    event.stopPropagation();
    selectedEdgeIdRef.current = edge.id;
  
    // 모달 열기 전에 잠깐 닫았다가 다시 열도록 처리
    setEdgeColorModalOpen(false); // 먼저 닫기
    setTimeout(() => {
      setSelectedEdge(edge);
      setSelectedNode(null);
      setEdgeColorModalOpen(true); // 다시 열기
    }, 0);
  
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...(e.style || {}),
          strokeWidth: e.id === edge.id ? 6 : 3,
        },
      }))
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* ✅ 상단 고정된 노드 추가 영역 (공간을 차지함) */}
      {!isReadOnly && (
        <div className="w-full flex gap-2 px-4 py-1">
          {[
            { type: 'customGroup', label: '그룹' },
            { type: 'square', label: '사각형' },
            { type: 'condition', label: '조건' },
            { type: 'table', label: '테이블' },
            { type: 'circle', label: '원형' },
          ].map((btn) => (
            <button
              key={btn.type}
              onClick={() => createNode(btn.type)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded"
            >
              + {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* ✅ 아래 영역: ReactFlow 전체 */}
      <div className="flex-1 flex flex-row">
        <div className="flex-1 relative border border-gray-300 rounded m-2">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isReadOnly ? undefined : onNodesChangeWithGrouping}
            onEdgesChange={isReadOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onPaneClick={() => {
              resetEdgeStyles();
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
            nodeTypes={nodeTypes}
            connectionLineType="bezier"
            connectionMode="strict"
            defaultEdgeOptions={{
              style: { strokeWidth: 3, stroke: '#999999', cursor: 'pointer' },
              interactionWidth: 20,
            }}
            zoomOnDoubleClick={false}
            fitView
            nodesDraggable={!isReadOnly}
            nodesConnectable={!isReadOnly}
            nodesFocusable={!isReadOnly}
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>

      {edgeColorModalOpen && selectedEdge && !isReadOnly && (
        <EdgeColorModal
          edge={selectedEdge}
          onClose={() => setEdgeColorModalOpen(false)}
          onSave={(color) => {
            setEdges((eds) => {
              const updated = eds.map((edge) =>
                edge.id === selectedEdge.id
                  ? {
                      ...edge,
                      style: { ...(edge.style || {}), stroke: color },
                    }
                  : edge
              );
              const newSelected = updated.find((e) => e.id === selectedEdge.id);
              setSelectedEdge(newSelected);
              return updated;
            });
            setEdgeColorModalOpen(false);
          }}
        />
      )}
    </div>

  );
});

export default FlowEditor;
