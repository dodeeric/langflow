import { useCallback, useEffect, useState } from "react";
import { NodeToolbar } from "reactflow";
import ShadTooltip from "../../components/ShadTooltipComponent";
import Tooltip from "../../components/TooltipComponent";
import IconComponent from "../../components/genericIconComponent";
import InputComponent from "../../components/inputComponent";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { priorityFields } from "../../constants/constants";
import { BuildStatus } from "../../constants/enums";
import NodeToolbarComponent from "../../pages/FlowPage/components/nodeToolbarComponent";
import useFlowStore from "../../stores/flowStore";
import useFlowsManagerStore from "../../stores/flowsManagerStore";
import { useTypesStore } from "../../stores/typesStore";
import { validationStatusType } from "../../types/components";
import { NodeDataType } from "../../types/flow";
import { handleKeyDown, scapedJSONStringfy } from "../../utils/reactflowUtils";
import { nodeColors, nodeIconsLucide } from "../../utils/styleUtils";
import { classNames, cn, getFieldTitle } from "../../utils/utils";
import ParameterComponent from "./components/parameterComponent";
import Loading from "../../components/ui/loading";

export default function GenericNode({
  data,
  xPos,
  yPos,
  selected,
}: {
  data: NodeDataType;
  selected: boolean;
  xPos: number;
  yPos: number;
}): JSX.Element {
  const types = useTypesStore((state) => state.types);
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const flowPool = useFlowStore((state) => state.flowPool);
  const buildFlow = useFlowStore((state) => state.buildFlow);
  const setNode = useFlowStore((state) => state.setNode);
  const name = nodeIconsLucide[data.type] ? data.type : types[data.type];
  const [inputName, setInputName] = useState(false);
  const [nodeName, setNodeName] = useState(data.node!.display_name);
  const [inputDescription, setInputDescription] = useState(false);
  const [nodeDescription, setNodeDescription] = useState(
    data.node?.description!
  );
  const [validationStatus, setValidationStatus] =
    useState<validationStatusType | null>(null);
  const [handles, setHandles] = useState<number>(0);

  const takeSnapshot = useFlowsManagerStore((state) => state.takeSnapshot);

  function countHandles(): void {
    let count = Object.keys(data.node!.template)
      .filter((templateField) => templateField.charAt(0) !== "_")
      .map((templateCamp) => {
        const { template } = data.node!;
        if (template[templateCamp].input_types) return true;
        if (!template[templateCamp].show) return false;
        switch (template[templateCamp].type) {
          case "str":
          case "bool":
          case "float":
          case "code":
          case "prompt":
          case "file":
          case "int":
            return false;
          default:
            return true;
        }
      })
      .reduce((total, value) => total + (value ? 1 : 0), 0);

    setHandles(count);
  }
  useEffect(() => {
    countHandles();
  }, [data, data.node]);

  useEffect(() => {
    if (!selected) {
      setInputName(false);
      setInputDescription(false);
    }
  }, [selected]);

  // State for outline color
  const isBuilding = useFlowStore((state) => state.isBuilding);

  // should be empty string if no duration
  // else should be `Duration: ${duration}`
  const getDurationString = (duration: number | null): string => {
    if (duration === null) {
      return "";
    } else {
      return `Duration: ${duration}`;
    }
  };

  const durationString = getDurationString(validationStatus?.data.duration);

  useEffect(() => {
    setNodeDescription(data.node!.description);
  }, [data.node!.description]);

  useEffect(() => {
    setNodeName(data.node!.display_name);
  }, [data.node!.display_name]);

  useEffect(() => {
    const relevantData =
      flowPool[data.id] && flowPool[data.id]?.length > 0
        ? flowPool[data.id][flowPool[data.id].length - 1]
        : null;
    if (relevantData) {
      // Extract validation information from relevantData and update the validationStatus state
      setValidationStatus(relevantData);
    } else {
      setValidationStatus(null);
    }
  }, [flowPool, data.id]);

  const showNode = data.showNode ?? true;
  const pinned = data.node?.pinned ?? false;

  const nameEditable = data.node?.flow || data.type === "CustomComponent";

  const emojiRegex = /\p{Emoji}/u;
  const isEmoji = emojiRegex.test(data?.node?.icon!);

  const iconNodeRender = useCallback(() => {
    const iconElement = data?.node?.icon;
    const iconColor = nodeColors[types[data.type]];
    const iconName =
      iconElement || (data.node?.flow ? "group_components" : name);
    const iconClassName = `generic-node-icon ${
      !showNode ? "absolute inset-x-6 h-12 w-12" : ""
    }`;

    if (iconElement && isEmoji) {
      return nodeIconFragment(iconElement);
    } else {
      return checkNodeIconFragment(iconColor, iconName, iconClassName);
    }
  }, [data, isEmoji, name, showNode]);

  const nodeIconFragment = (icon) => {
    return <span className="text-lg">{icon}</span>;
  };

  const checkNodeIconFragment = (iconColor, iconName, iconClassName) => {
    return (
      <IconComponent
        name={iconName}
        className={iconClassName}
        iconColor={iconColor}
      />
    );
  };

  const getIconPlayOrPauseComponent = (name, className) => (
    <IconComponent
      name={name}
      className={`absolute h-5 stroke-2 ${className} ml-0.5`}
    />
  );

  const getStatusClassName = (
    validationStatus: validationStatusType | null,
  ) => {
    if (validationStatus && validationStatus.valid) {
      return "green-status";
    } else if (validationStatus && !validationStatus.valid) {
      return "red-status";
    } else if (!validationStatus) {
      return "yellow-status";
    } else {
      return "status-build-animation";
    }
  };

  const renderIconPlayOrPauseComponents = (
    buildStatus: BuildStatus | undefined,
    validationStatus: validationStatusType | null,
  ) => {
    if (buildStatus === BuildStatus.BUILDING) {
      return <Loading/>
    } else {
      const className = getStatusClassName(validationStatus);
      return <>{getIconPlayOrPauseComponent("Play", className)}</>;
    }
  };

  const getSpecificClassFromBuildStatus = (
    buildStatus: BuildStatus | undefined,
    validationStatus: validationStatusType | null
  ) => {
    if (
      buildStatus === BuildStatus.BUILT &&
      validationStatus &&
      !validationStatus.valid
    ) {
      return "border-none ring ring-red-300";
    } else if (buildStatus === BuildStatus.BUILDING) {
      return "border-none ring";
    } else {
      return "";
    }
  };

  const getNodeBorderClassName = (
    selected: boolean,
    showNode: boolean,
    buildStatus: BuildStatus | undefined,
    validationStatus: validationStatusType | null
  ) => {
    return classNames(
      getBaseBorderClass(selected),
      getNodeSizeClass(showNode),
      "generic-node-div",
      getSpecificClassFromBuildStatus(buildStatus, validationStatus)
    );
  };

  const getBaseBorderClass = (selected) =>
    selected ? "border border-ring" : "border";

  const getNodeSizeClass = (showNode) =>
    showNode ? "w-96 rounded-lg" : "w-26 h-26 rounded-full";

  return (
    <>
      <NodeToolbar>
        <NodeToolbarComponent
          position={{ x: xPos, y: yPos }}
          data={data}
          deleteNode={(id) => {
            takeSnapshot();
            deleteNode(id);
          }}
          setShowNode={(show: boolean) => {
            setNode(data.id, (old) => ({
              ...old,
              data: { ...old.data, showNode: show },
            }));
          }}
          numberOfHandles={handles}
          showNode={showNode}
          openAdvancedModal={false}
          onCloseAdvancedModal={() => {}}
        ></NodeToolbarComponent>
      </NodeToolbar>

      <div
        className={getNodeBorderClassName(
          selected,
          showNode,
          data?.build_status,
          validationStatus
        )}
      >
        {data.node?.beta && showNode && (
          <div className="beta-badge-wrapper">
            <div className="beta-badge-content">BETA</div>
          </div>
        )}
        <div>
          <div
            data-testid={"div-generic-node"}
            className={
              "generic-node-div-title " +
              (!showNode
                ? " relative h-24 w-24 rounded-full "
                : " justify-between rounded-t-lg ")
            }
          >
            <div
              className={
                "generic-node-title-arrangement rounded-full" +
                (!showNode && "justify-center")
              }
            >
              {iconNodeRender()}
              {showNode && (
                <div className="generic-node-tooltip-div">
                  {nameEditable && inputName ? (
                    <div>
                      <InputComponent
                        onBlur={() => {
                          setInputName(false);
                          if (nodeName.trim() !== "") {
                            setNodeName(nodeName);
                            setNode(data.id, (old) => ({
                              ...old,
                              data: {
                                ...old.data,
                                node: {
                                  ...old.data.node,
                                  display_name: nodeName,
                                },
                              },
                            }));
                          } else {
                            setNodeName(data.node!.display_name);
                          }
                        }}
                        value={nodeName}
                        onChange={setNodeName}
                        password={false}
                        blurOnEnter={true}
                      />
                    </div>
                  ) : (
                    <ShadTooltip content={data.node?.display_name}>
                      <div
                        className="flex items-center gap-2"
                        onDoubleClick={(event) => {
                          if (nameEditable) {
                            setInputName(true);
                          }
                          takeSnapshot();
                          event.stopPropagation();
                          event.preventDefault();
                        }}
                      >
                        <div
                          data-testid={"title-" + data.node?.display_name}
                          className="generic-node-tooltip-div text-primary"
                        >
                          {data.node?.display_name}
                        </div>
                        {nameEditable && (
                          <IconComponent
                            name="Pencil"
                            className="h-4 w-4 text-ring"
                          />
                        )}
                      </div>
                    </ShadTooltip>
                  )}
                </div>
              )}
            </div>
            <div>
              {!showNode && (
                <>
                  {Object.keys(data.node!.template)
                    .filter((templateField) => templateField.charAt(0) !== "_")
                    .map(
                      (templateField: string, idx) =>
                        data.node!.template[templateField].show &&
                        !data.node!.template[templateField].advanced && (
                          <ParameterComponent
                            index={idx.toString()}
                            key={scapedJSONStringfy({
                              inputTypes:
                                data.node!.template[templateField].input_types,
                              type: data.node!.template[templateField].type,
                              id: data.id,
                              fieldName: templateField,
                              proxy: data.node!.template[templateField].proxy,
                            })}
                            data={data}
                            color={
                              nodeColors[
                                types[data.node?.template[templateField].type!]
                              ] ??
                              nodeColors[
                                data.node?.template[templateField].type!
                              ] ??
                              nodeColors.unknown
                            }
                            title={getFieldTitle(
                              data.node?.template!,
                              templateField
                            )}
                            info={data.node?.template[templateField].info}
                            name={templateField}
                            tooltipTitle={
                              data.node?.template[
                                templateField
                              ].input_types?.join("\n") ??
                              data.node?.template[templateField].type
                            }
                            required={
                              data.node!.template[templateField].required
                            }
                            id={{
                              inputTypes:
                                data.node!.template[templateField].input_types,
                              type: data.node!.template[templateField].type,
                              id: data.id,
                              fieldName: templateField,
                            }}
                            left={true}
                            type={data.node?.template[templateField].type}
                            optionalHandle={
                              data.node?.template[templateField].input_types
                            }
                            proxy={data.node?.template[templateField].proxy}
                            showNode={showNode}
                          />
                        )
                    )}
                  <ParameterComponent
                    key={scapedJSONStringfy({
                      baseClasses: data.node!.base_classes,
                      id: data.id,
                      dataType: data.type,
                    })}
                    data={data}
                    color={nodeColors[types[data.type]] ?? nodeColors.unknown}
                    title={
                      data.node?.output_types &&
                      data.node.output_types.length > 0
                        ? data.node.output_types.join(" | ")
                        : data.type
                    }
                    tooltipTitle={data.node?.base_classes.join("\n")}
                    id={{
                      baseClasses: data.node!.base_classes,
                      id: data.id,
                      dataType: data.type,
                    }}
                    type={data.node?.base_classes.join("|")}
                    left={false}
                    showNode={showNode}
                  />
                </>
              )}
            </div>
            {showNode && (
              <Button
                variant="outline"
                className="h-9 px-1.5"
                onClick={() => {
                  setNode(data.id, (old) => ({
                    ...old,
                    data: {
                      ...old.data,
                      node: {
                        ...old.data.node,
                        pinned: old.data?.node?.pinned ? false : true,
                      },
                    },
                  }));
                }}
              >
                <Tooltip title={<span>{pinned ? "Pin Output" : "Unpin Output"}</span>}>
                  <div className="generic-node-status-position flex items-center">
                    <IconComponent
                      name={"Pin"}
                      className={cn(
                        "h-5 fill-transparent stroke-chat-trigger stroke-2 transition-all",
                        pinned ? "animate-wiggle fill-chat-trigger" : ""
                      )}
                    />
                  </div>
                </Tooltip>
              </Button>
            )}
            {showNode && (
              <Button
                
                variant="outline"
                className={"h-9 px-1.5"}
                onClick={() => {
                  if(data?.build_status === BuildStatus.BUILDING || isBuilding) return;
                  buildFlow(data.id)
                }}
              >
                <div>
                  <Tooltip
                    title={
                      data?.build_status === BuildStatus.BUILDING ? (
                        <span>Building...</span>
                      ) : !validationStatus ? (
                        <span className="flex">
                          Build{" "}
                          <IconComponent
                            name="Play"
                            className=" h-5 stroke-build-trigger stroke-2"
                          />{" "}
                          flow to validate status.
                        </span>
                      ) : (
                        <div className="max-h-96 overflow-auto">
                          {typeof validationStatus.params === "string"
                            ? `${durationString}\n${validationStatus.params}`
                                .split("\n")
                                .map((line, index) => (
                                  <div key={index}>{line}</div>
                                ))
                            : durationString}
                        </div>
                      )
                    }
                  >
                    <div className="generic-node-status-position flex items-center justify-center">
                      {renderIconPlayOrPauseComponents(
                        data?.build_status,
                        validationStatus)}
                    </div>
                  </Tooltip>
                </div>
              </Button>
            )}
          </div>
        </div>

        {showNode && (
          <div
            className={
              showNode
                ? data.node?.description === "" && !nameEditable
                  ? "pb-5"
                  : "py-5"
                : ""
            }
          >
            <div className="generic-node-desc">
              {showNode && nameEditable && inputDescription ? (
                <Textarea
                  autoFocus
                  onBlur={() => {
                    setInputDescription(false);
                    setInputName(false);
                    setNodeDescription(nodeDescription);
                    setNode(data.id, (old) => ({
                      ...old,
                      data: {
                        ...old.data,
                        node: {
                          ...old.data.node,
                          description: nodeDescription,
                        },
                      },
                    }));
                  }}
                  value={nodeDescription}
                  onChange={(e) => setNodeDescription(e.target.value)}
                  onKeyDown={(e) => {
                    handleKeyDown(e, nodeDescription, "");
                    if (
                      e.key === "Enter" &&
                      e.shiftKey === false &&
                      e.ctrlKey === false &&
                      e.altKey === false
                    ) {
                      setInputDescription(false);
                      setNodeDescription(nodeDescription);
                      setNode(data.id, (old) => ({
                        ...old,
                        data: {
                          ...old.data,
                          node: {
                            ...old.data.node,
                            description: nodeDescription,
                          },
                        },
                      }));
                    }
                  }}
                />
              ) : (
                <div
                  className={cn(
                    "generic-node-desc-text truncate-multiline word-break-break-word",
                    (data.node?.description === "" ||
                      !data.node?.description) &&
                      nameEditable
                      ? "font-light italic"
                      : ""
                  )}
                  onDoubleClick={(e) => {
                    setInputDescription(true);
                    takeSnapshot();
                  }}
                >
                  {(data.node?.description === "" || !data.node?.description) &&
                  nameEditable
                    ? "Double Click to Edit Description"
                    : data.node?.description}
                </div>
              )}
            </div>
            <>
              {Object.keys(data.node!.template)
                .filter((templateField) => templateField.charAt(0) !== "_")
                .sort((a, b) => {
                  if (priorityFields.has(a.toLowerCase())) {
                    return -1;
                  } else if (priorityFields.has(b.toLowerCase())) {
                    return 1;
                  } else {
                    return a.localeCompare(b);
                  }
                })
                .map((templateField: string, idx) => (
                  <div key={idx}>
                    {data.node!.template[templateField].show &&
                    !data.node!.template[templateField].advanced ? (
                      <ParameterComponent
                        index={idx.toString()}
                        key={scapedJSONStringfy({
                          inputTypes:
                            data.node!.template[templateField].input_types,
                          type: data.node!.template[templateField].type,
                          id: data.id,
                          fieldName: templateField,
                          proxy: data.node!.template[templateField].proxy,
                        })}
                        data={data}
                        color={
                          data.node?.template[templateField].input_types &&
                          data.node?.template[templateField].input_types!
                            .length > 0
                            ? nodeColors[
                                data.node?.template[templateField]
                                  .input_types![0]
                              ] ??
                              nodeColors[
                                types[
                                  data.node?.template[templateField]
                                    .input_types![0]
                                ]
                              ]
                            : nodeColors[
                                data.node?.template[templateField].type!
                              ] ??
                              nodeColors[
                                types[data.node?.template[templateField].type!]
                              ] ??
                              nodeColors.unknown
                        }
                        title={getFieldTitle(
                          data.node?.template!,
                          templateField
                        )}
                        info={data.node?.template[templateField].info}
                        name={templateField}
                        tooltipTitle={
                          data.node?.template[templateField].input_types?.join(
                            "\n"
                          ) ?? data.node?.template[templateField].type
                        }
                        required={data.node!.template[templateField].required}
                        id={{
                          inputTypes:
                            data.node!.template[templateField].input_types,
                          type: data.node!.template[templateField].type,
                          id: data.id,
                          fieldName: templateField,
                        }}
                        left={true}
                        type={data.node?.template[templateField].type}
                        optionalHandle={
                          data.node?.template[templateField].input_types
                        }
                        proxy={data.node?.template[templateField].proxy}
                        showNode={showNode}
                      />
                    ) : (
                      <></>
                    )}
                  </div>
                ))}
              <div
                className={classNames(
                  Object.keys(data.node!.template).length < 1 ? "hidden" : "",
                  "flex-max-width justify-center"
                )}
              >
                {" "}
              </div>
              {data.node!.base_classes.length > 0 && (
                <ParameterComponent
                  key={scapedJSONStringfy({
                    baseClasses: data.node!.base_classes,
                    id: data.id,
                    dataType: data.type,
                  })}
                  data={data}
                  color={
                    (data.node?.output_types &&
                    data.node.output_types.length > 0
                      ? nodeColors[data.node.output_types[0]] ??
                        nodeColors[types[data.node.output_types[0]]]
                      : nodeColors[types[data.type]]) ?? nodeColors.unknown
                  }
                  title={
                    data.node?.output_types && data.node.output_types.length > 0
                      ? data.node.output_types.join(" | ")
                      : data.type
                  }
                  tooltipTitle={data.node?.base_classes.join("\n")}
                  id={{
                    baseClasses: data.node!.base_classes,
                    id: data.id,
                    dataType: data.type,
                  }}
                  type={data.node?.base_classes.join("|")}
                  left={false}
                  showNode={showNode}
                />
              )}
            </>
          </div>
        )}
      </div>
    </>
  );
}
