"use strict";

let _webResourceName = "WebResource_fieldParentAccountNumber";

var OpprtunityRibbon = OpprtunityRibbon || {
    checkOrganization: function(primaryControl) {
        let formContext = primaryControl;

        let accountLookup = formContext.getAttribute("parentaccountid").getValue();
        if (!accountLookup) {
            let nameOpportunity = formContext.getAttribute("name").getValue();
            let data = {
                "name": "New account of " + nameOpportunity,
                "accountnumber": "9999",
            }

            Xrm.WebApi.createRecord("account", data).then(
                function success(result) {
                    console.log("Account created with ID: " + result.id);
                    let lookup = [];
                    lookup[0] = {
                        "id": result.id,
                        "entityType": "account",
                        "name": data.name
                    };
                    formContext.getAttribute("parentaccountid").setValue(lookup);
                    formContext.data.save().then(
                        function success() {
                            Xrm.Utility.openEntityForm(formContext.data.entity.getEntityName(),
                                formContext.data.entity.getId());
                        },
                        function failed(error) {
                            console.log(error.message);
                        }
                    );
                },
                function(error) {
                    console.log(error.message);
                }
            );
        }
    },
    createEmail: async function(primaryControl) {

        let globalContext = Xrm.Utility.getGlobalContext();

        let formContext = primaryControl;

        let accountLookup = formContext.getAttribute("parentaccountid").getValue();
        let nameOpportunity = formContext.getAttribute("name").getValue();
        let owner = formContext.getAttribute("ownerid").getValue();

        let subject = `${nameOpportunity}`
        let description = `Attached documentation of opportunity ${nameOpportunity}`;

        if (accountLookup) {
            subject += ` ${accountLookup[0].name}`
        }

        let userId = globalContext.userSettings.userId.slice(1, -1);

        let activityParties = []
        let sender = {
            "partyid_systemuser@odata.bind": "/systemusers(" + userId + ")",
            "participationtypemask": 1
        };

        activityParties.push(sender);


        for (let i = 0; i < owner.length; i++) {
            let receiver = {
                "partyid_systemuser@odata.bind": "/systemusers(" + owner[i].id.slice(1, -1) + ")",
                "participationtypemask": 2
            };
            activityParties.push(receiver);
        }


        let createEmailRequest = {
            "description": description,
            "subject": subject,
            "email_activity_parties": activityParties
        }

        let email = await Xrm.WebApi.createRecord('email', createEmailRequest);

        let attachments = await Xrm.WebApi.retrieveMultipleRecords("annotation", "?$select=filename,mimetype,documentbody" +
            "&$filter=isdocument eq true and objecttypecode eq \'opportunity\' " +
            `and _objectid_value eq ${formContext.data.entity.getId()}`);

        attachments.entities.forEach(attachment => {
            this.bindNoteWithAttachment(email.id, attachment);
        });

        this.sendEmail(email.id);
    },
    sendEmail: function(emailId) {
        let parameters = {};
        parameters.IssueSend = true;
        let req = new XMLHttpRequest();
        req.open("POST", Xrm.Page.context.getClientUrl() + "/api/data/v9.2/emails(" + emailId + ")/Microsoft.Dynamics.CRM.SendEmail", true);
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.onreadystatechange = function() {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    let results = JSON.parse(this.response);
                } else {
                    console.log(this.statusText);
                }
            }
        };
        req.send(JSON.stringify(parameters));
    },
    bindNoteWithAttachment: function(emailId, note) {
        let attachmentEntity = {
            "objectid_email@odata.bind": "/emails(" + emailId + ")",
            "filename": note.filename,
            "mimetype": note.mimetype,
            "body": note.documentbody,
            "objecttypecode": "email"
        };

        Xrm.WebApi.createRecord('activitymimeattachment', attachmentEntity);
    }
};