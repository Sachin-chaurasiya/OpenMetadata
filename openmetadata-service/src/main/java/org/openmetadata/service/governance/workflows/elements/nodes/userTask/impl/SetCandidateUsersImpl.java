package org.openmetadata.service.governance.workflows.elements.nodes.userTask.impl;

import static org.openmetadata.service.governance.workflows.Workflow.EXCEPTION_VARIABLE;
import static org.openmetadata.service.governance.workflows.Workflow.WORKFLOW_RUNTIME_EXCEPTION;
import static org.openmetadata.service.governance.workflows.WorkflowHandler.getProcessDefinitionKeyFromId;

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.flowable.common.engine.api.delegate.Expression;
import org.flowable.engine.delegate.BpmnError;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.openmetadata.service.util.JsonUtils;

@Slf4j
public class SetCandidateUsersImpl implements TaskListener {
  private Expression assigneesVarNameExpr;

  @Override
  public void notify(DelegateTask delegateTask) {
    try {
      List<String> assignees =
          JsonUtils.readOrConvertValue(
              delegateTask.getVariable(assigneesVarNameExpr.getValue(delegateTask).toString()),
              List.class);
      delegateTask.addCandidateUsers(assignees);
    } catch (Exception exc) {
      LOG.error(
          String.format(
              "[%s] Failure: ",
              getProcessDefinitionKeyFromId(delegateTask.getProcessDefinitionId())),
          exc);
      delegateTask.setVariable(EXCEPTION_VARIABLE, exc.toString());
      throw new BpmnError(WORKFLOW_RUNTIME_EXCEPTION, exc.getMessage());
    }
  }
}