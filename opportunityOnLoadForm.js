function OnLoad(executionContext) {
    let formContext = executionContext.getFormContext();
    let wrControl = formContext.getControl("WebResource_fieldParentAccountNumber");
    if (wrControl) {
        wrControl.getContentWindow().then(
            function(contentWindow) {
                contentWindow.setClientContext(Xrm, formContext);
            }
        )
    }
}