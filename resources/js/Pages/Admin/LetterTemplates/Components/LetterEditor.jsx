// import tinymce
import { Editor } from "@tinymce/tinymce-react";

export default function LetterEditor({
    value,
    onChange,
    employeeVariables = [],
    companyVariables = [],
    documentVariables = [],
}) {
    return (
        <Editor
            apiKey={import.meta.env.VITE_TINYMCE_KEY}
            value={value}
            onEditorChange={(content) => onChange(content)}
            init={{
                height: 600,
                menubar: true,
                plugins: [
                    "lists",
                    "table",
                    "code",
                    "autolink",
                    "link",
                ],
                onboarding: false,
                toolbar:
                    "insertVariableDocument | insertVariableCompany | insertVariableEmployee | bold italic underline | alignleft aligncenter alignright | " +
                    "bullist numlist | table | code",

                setup: (editor) => {
                    editor.ui.registry.addMenuButton("insertVariableDocument", {
                        icon: "document-properties",
                        text: "Surat",
                        fetch: (callback) => {
                            const items = documentVariables.map((variable) => ({
                                type: "menuitem",
                                text: variable.label,
                                onAction: () => {
                                    editor.insertContent(
                                        `{{${variable.key}}}`
                                    );
                                },
                            }));
                            callback(items);
                        },
                    });

                    // custom button variable perusahaan
                    editor.ui.registry.addMenuButton("insertVariableCompany", {
                        icon: "building",
                        text: "Perusahaan",
                        fetch: (callback) => {
                            const items = companyVariables.map((variable) => ({
                                type: "menuitem",
                                text: variable.label,
                                onAction: () => {
                                    editor.insertContent(
                                        `{{${variable.key}}}`
                                    );
                                },
                            }));
                            callback(items);
                        },
                    });

                    // custom button variable pegawai
                    editor.ui.registry.addMenuButton("insertVariableEmployee", {
                        icon: "user",
                        text: "Pegawai",
                        fetch: (callback) => {
                            const items = employeeVariables.map((variable) => ({
                                type: "menuitem",
                                text: variable.label,
                                onAction: () => {
                                    editor.insertContent(
                                        `{{${variable.key}}}`
                                    );
                                },
                            }));
                            callback(items);
                        },
                    });
                },
            }}
        />
    );
}
