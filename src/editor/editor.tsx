// React core hooks – Most fundamental, always first
import { useEffect, useState, useTransition, useRef } from 'react';

// UI Components from your own project (custom or shadcn/ui) – High priority, used frequently
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '../components/ui/resizable';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';

// Icons – Visual elements, grouped together for clarity
import {
    Sparkles,
    Code,
    FileUp,
    Eye,
    Save,
    Plus,
    X,
    Copy,
    Check,
    Upload,
    Github,
} from 'lucide-react';

// State management – Jotai atoms and hooks
import { useAtom } from 'jotai';
import { editModalAtom } from '@/components/ui'; // Note: this path looks unusual – consider moving atoms to a dedicated folder like '@/atoms'

// Third-party editor component – Major interactive feature
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';

// Utilities and side-effects (toasts, data)
import { toast } from '@/hooks/use-toast';
import type { Project } from '@/models/project';
import { useProjects } from '@/contexts/project-context';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

// Commented-out / unused imports – Keep at the bottom for easy cleanup later
// import CodeMirror from '@uiw/react-codemirror';
// import { html } from '@codemirror/lang-html';

export const defaultProject: Project = {
    id: '',
    name: "new title",
    ideaDescription: "Description",
    // prototypeCode: defaultCode,
};
interface projectEditorProps {
    p: Project | undefined;
}
const Editor = ({ p }: projectEditorProps) => {
    const [isCodeLoading, setIsCodeLoading] = useState<boolean>(false);
    const [isQuestionsLoading, setIsQuestionsLoading] = useState<boolean>(false);
    const [{ isOpen }, setEditModal] = useAtom(editModalAtom);
    const [project, setProject] = useState<Project>(p || defaultProject);
    const [copied, setCopied] = useState(false);
    const { updateProject, createProject, uploadPrototype } = useProjects();
    const [isSaving, startSaving] = useTransition();
    const [isUploading, startUploading] = useTransition();
    const [uploadSuccess, setUploadSuccess] = useState<{ isOpen: boolean; objectId: string }>({ isOpen: false, objectId: '' });

    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const currAccount = useCurrentAccount();

    useEffect(() => {
        if (!isOpen) return;

        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setEditModal({ isOpen: false, pageNumber: -1 });
            }
        };

        window.addEventListener("keydown", handleEscKey);

        return () => {
            window.removeEventListener("keydown", handleEscKey);
        };
    }, [isOpen, setEditModal]);



    //======================State=========================//
    const updateProjectState = (updatedFields: Partial<Project>) => {
        setProject(prevProject => ({ ...prevProject, ...updatedFields }));
    }

    const handleAnswerChange = (index: number, value: string) => {
        const newQuestions = [...(project.guidedQuestions || [])];
        newQuestions[index].answer = value;
        updateProjectState({ guidedQuestions: newQuestions });
    }

    const handleAppendAnswer = (value: string) => {
        updateProjectState({ ideaDescription: project.ideaDescription + '\n' + value });
    }
    const handleFileChange = () => { }

    const handleCopyObjectId = () => {
        navigator.clipboard.writeText(uploadSuccess.objectId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const handleOpenInExplorer = () => {
        // http://testnet.suivision.xyz/object/0x6c87d91a0afd7a00883d360cafe7fd27efaffeb7880506a2dc43fcc24fcc0dd8
        const explorerUrl = `https://testnet.suivision.xyz/object/${uploadSuccess.objectId}`;
        window.open(explorerUrl, '_blank');
    }
    const handleOpenGithubTool = () => {
        const githubUrl = `https://github.com/TuanAnhDoHoang/run-site`;
        window.open(githubUrl, '_blank');
    }

    // Prototype Upload Handler
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handlePrototypeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
                toast({ title: 'Invalid file type', description: 'Please upload an HTML file.', variant: 'destructive' });
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) {
                    updateProjectState({ prototypeCode: content });
                    toast({ title: 'Prototype Updated', description: 'Code uploaded successfully.' });
                }
            };
            reader.readAsText(file);
        }
    };
    //END======================State=========================//


    //======================AI=========================//
    // const handleGenerateCode = async () => {
    //     if (!project.ideaDescription) {
    //         toast({
    //             title: 'Error', description: 'Please provide an idea description first.', variant: 'destructive'
    //         });
    //         return;
    //     }
    //     setIsCodeLoading(true);
    //     try {
    //         const result = await fetch('/api/generate-code', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({
    //                 ideaDescription: project.ideaDescription,
    //                 programmingLanguage: 'javascript'
    //             }),
    //         }).then(res => res.json())
    //         updateProjectState({ prototypeCode: result.code });
    //         toast({
    //             title: 'Code Generated', description: 'A prototype has been generated based on your idea.'
    //         });
    //     } catch (error) {
    //         console.error(error);
    //         toast({
    //             title: 'Error', description: 'Failed to generate code.', variant: 'destructive'
    //         });
    //     } finally {
    //         setIsCodeLoading(false);
    //     }
    // }


    const handleGenerateQuestions = async () => {
        if (!project.ideaDescription) {
            toast({ title: 'Error', description: 'Please provide an idea description first.', variant: 'destructive' });
            return;
        }
        setIsQuestionsLoading(true);
        updateProjectState({ guidedQuestions: [] });
        try {
            const result = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ideaDescription: project.ideaDescription }),
            }).then(res => res.json())

            updateProjectState({ guidedQuestions: result.questions.map((q: string) => ({ question: q, answer: '' })) });
            toast({ title: 'Questions Generated', description: 'Here are some questions to help you mature your idea.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate questions.', variant: 'destructive' });
        } finally {
            setIsQuestionsLoading(false);
        }
    }
    //END======================AI=========================//


    //======================prototype=========================//
    const handleCopyCode = () => {
        navigator.clipboard.writeText(project.prototypeCode || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset sau 2 giây
    }
    const handleOpenPreview = () => {
        if (project.prototypeCode) {
            const previewWindow = window.open();
            if (previewWindow) {
                previewWindow.document.open();
                previewWindow.document.write(project.prototypeCode);
                previewWindow.document.close();
            }
        }
    }
    //END======================prototype=========================//


    //======================storage=========================//
    const handleSave = () => {
        startSaving(async () => {
            try {
                if (project.id) {
                    // Update existing project
                    await updateProject(project.id, { ...project });
                    toast({ title: 'Idea Updated!', description: 'Your changes have been saved.' });
                } else {
                    // Create new project
                    const newProject = await createProject({
                        name: project.name,
                        ideaDescription: project.ideaDescription,
                        guidedQuestions: project.guidedQuestions || [],
                        prototypeCode: project.prototypeCode || "",
                        projectFiles: project.projectFiles || []
                    });
                    if (newProject) {
                        toast({ title: 'Idea Created!', description: 'Your new idea has been created.' });
                    }
                }
            } catch (error) {
                console.error(error);
                toast({ title: 'Error', description: 'Failed to save idea.', variant: 'destructive' });
            }
        });
    }
    //END======================storage=========================//


    //======================Other=========================//
    const handleRemoveFile = (index: number) => {
        const newFiles = [...(project.projectFiles || [])];
        newFiles.splice(index, 1);
        updateProjectState({ projectFiles: newFiles });
    }
    const handlePublishSite = () => {
        if (!currAccount) alert("Connect wallet first");
        if (!project.prototypeCode) alert("No prototype code available");
        startUploading(async () => {
            if (project.prototypeCode && currAccount) {
                const publishMan = import.meta.env.VITE_PublishMan;
                //pass calculate cost step
                const cost = 1_00_000;
                const tx = new Transaction();
                const coin = tx.splitCoins(tx.gas, [cost]);
                tx.transferObjects([coin], publishMan);
                await new Promise<void>((resolve, reject) => {
                    signAndExecuteTransaction({
                        transaction: tx,
                    }, {
                        onSuccess: (data) => {
                            console.log('Transaction successful:', data);
                            resolve();
                        },
                        onError: (error) => {
                            reject(new Error(`Transaction failed: ${error.message}`));
                        }
                    })
                });
                const response = await uploadPrototype({
                    project,
                    address: currAccount.address,
                });
                if (response && response.response.object_id) {
                    setUploadSuccess({ isOpen: true, objectId: response.response.object_id });
                }
            }
        });
    }
    //END======================Other=========================//


    return (
        <>
            <ResizablePanelGroup direction="horizontal" className="h-full w-full text-slate-100">
                <ResizablePanel defaultSize={70}>
                    <ResizablePanelGroup direction='vertical'>
                        <ResizablePanel defaultSize={project.prototypeCode ? 60 : 100}>
                            <div className="flex flex-col h-full bg-card rounded-lg border">
                                <h1 className='text-sm text-center pt-2'>{"<<Press ESC to exit>>"}</h1>
                                <div className='p-4 border-b flex items-center justify-between'>
                                    <Input
                                        placeholder="Untitled Idea"
                                        value={project.name}
                                        onChange={(e) => updateProjectState({ name: e.target.value })}
                                        className="text-2xl font-bold tracking-tight border-none shadow-none focus-visible:ring-0 resize-none p-0 h-auto"
                                    />
                                    <div className='flex items-center gap-2 items-center justify-center hover:cursor-pointer'>
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            <Save className="mr-2" />
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                                <ScrollArea className="h-full">
                                    <div className="relative p-6">
                                        <Textarea
                                            value={project.ideaDescription}
                                            onChange={(e) => updateProjectState({ ideaDescription: e.target.value })}
                                            className="relative min-h-[60vh] w-full border-none shadow-none focus-visible:ring-0"
                                            placeholder="Start writing your idea here..."
                                        />
                                    </div>
                                </ScrollArea>
                            </div>
                        </ResizablePanel>
                        {project.prototypeCode && (
                            <>
                                <ResizableHandle withHandle />
                                <ResizablePanel defaultSize={8} minSize={8}>
                                    <div className="flex flex-col h-full bg-card rounded-lg border">
                                        <div className='p-4 border-b flex items-center justify-between'>
                                            <h3 className="text-lg font-semibold flex items-center"><Code className="mr-2" /> Source </h3>
                                            <div className='flex items-center gap-2 items-center justify-center'>
                                                {copied ?
                                                    <Button>
                                                        <Check className="mr-2" />
                                                        Copied
                                                    </Button>
                                                    :
                                                    <Button onClick={handleCopyCode} className='hover:cursor-pointer'>
                                                        <Copy className="mr-2" />
                                                        Copy code
                                                    </Button>
                                                }

                                                <Button onClick={handleOpenPreview} className='hover:cursor-pointer'>
                                                    <Eye className="mr-2" />
                                                    Preview
                                                </Button>
                                                <Button onClick={handlePublishSite} className='hover:cursor-pointer'>
                                                    <Upload className="mr-2" />
                                                    {isUploading ? 'Publishing...' : 'Publish'}
                                                </Button>
                                            </div>
                                        </div>
                                        <AceEditor
                                            className="p-4 scrollbar scrollbar-thumb-gray-600 scrollbar-track-transparent scrollbar-thin hover:scrollbar-thumb-gray-400"
                                            height='100%'
                                            width='100%'
                                            mode="javascript" theme="monokai" value={project.prototypeCode} onChange={(e) => updateProjectState({ prototypeCode: e })} />
                                        {/* <ScrollArea className="h-full overflow-x-auto">
                                        <CodeMirror
                                            className='h-full w-full'
                                            extensions={[html()]} theme="dark" value={project.prototypeCode}
                                        />
                                    </ScrollArea> */}
                                    </div>
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={0} >
                    <div className="h-full bg-card rounded-lg border">
                        <ScrollArea className="h-[700px]">
                            <div className="p-4 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-lg"><Sparkles className="mr-2 text-primary" /> AI Tools</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button onClick={handleGenerateQuestions} disabled={isQuestionsLoading} className="w-full justify-start hover:cursor-pointer">
                                            <Sparkles className="mr-2" />
                                            {isQuestionsLoading ? 'Thinking...' : 'Guided Idea Maturation'}
                                        </Button>
                                        <div className="space-y-2">
                                            <Button
                                                // onClick={handleGenerateCode} 
                                                disabled={isCodeLoading} className="w-full justify-start hover:cursor-pointer ">
                                                <Code className="mr-2" />
                                                {isCodeLoading ? 'Generating...' : 'Generate Prototype'}
                                            </Button>
                                            {project.prototypeCode && (
                                                <Button onClick={handleOpenPreview} variant="outline" className="w-full justify-start hover:cursor-pointer">
                                                    <Eye className="mr-2" />
                                                    Preview Prototype
                                                </Button>
                                            )}
                                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full justify-start hover:cursor-pointer">
                                                <Upload className="mr-2" />
                                                Upload HTML Code
                                            </Button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept=".html"
                                                className="hidden"
                                                onChange={handlePrototypeUpload}
                                            />
                                        </div>
                                        <div className="space-y-2 hover:cursor-pointer">
                                            <Label htmlFor="project-files-upload" className='cursor-pointer'>
                                                <div className="w-full justify-start relative border p-2 rounded-md flex items-center hover:bg-muted">
                                                    <FileUp className="mr-2" />
                                                    <span>Upload Project Files</span>
                                                </div>
                                                <Input id="project-files-upload" type="file" className="sr-only" onChange={handleFileChange} multiple />
                                            </Label>
                                            {(project.projectFiles ?? []).length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    <p className="text-sm font-medium">Selected files:</p>
                                                    <ul className="list-disc list-inside bg-muted p-2 rounded-md">
                                                        {(project.projectFiles ?? []).map((file, index) => (
                                                            <li key={index} className="text-sm flex items-center justify-between">
                                                                <span>{file.filename}</span>
                                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start">
                    <Store className="mr-2" />
                    Publish to Kiosk
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Publish to Marketplace</DialogTitle>
                    <DialogDescription>Set a price for your idea and publish it to the marketplace.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">Price (SUI)</Label>
                      <Input id="price" type="number" value={project.price} onChange={(e) => updateProjectState({ price: Number(e.target.value) })} className="col-span-3" />
                    </div>
                  </div>
                  <Button onClick={handlePublish}>Publish for ${project.price} SUI</Button>
                </DialogContent>
              </Dialog> */}

                                {isQuestionsLoading && <div className="space-y-2 pt-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[80%]" />
                                    <Skeleton className="h-4 w-full" />
                                </div>}

                                {(project.guidedQuestions ?? []).length > 0 && (
                                    <div className='space-y-4'>
                                        <h3 className="font-semibold">Generated Questions</h3>
                                        {(project.guidedQuestions ?? []).map((q, index) => (
                                            <Card key={index}>
                                                <CardHeader className='pb-2'>
                                                    <p className='text-sm font-medium'>{q.question}</p>
                                                </CardHeader>
                                                <CardContent>
                                                    <Textarea
                                                        placeholder="Type your answer here..."
                                                        value={q.answer}
                                                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                                                        className="mb-2"
                                                    />
                                                    <Button size="sm" onClick={() => handleAppendAnswer(q.answer)} disabled={!q.answer}>
                                                        <Plus className="mr-2 h-4 w-4" /> Append to Idea
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
            <Dialog open={uploadSuccess.isOpen} onOpenChange={(open) => setUploadSuccess({ ...uploadSuccess, isOpen: open })}>
                <DialogContent className="bg-white border border-gray-200 shadow-lg">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 text-xl font-bold">Prototype Published Successfully! 🎉</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg break-all border border-blue-200">
                            <p className="text-xs text-gray-600 mb-2 font-semibold">Object ID</p>
                            <p className="font-mono text-sm text-gray-800">{uploadSuccess.objectId}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleCopyObjectId} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                {copied ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy ID
                                    </>
                                )}
                            </Button>
                            <Button onClick={handleOpenInExplorer} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white">
                                <Upload className="mr-2 h-4 w-4" />
                                Open in Explorer
                            </Button>
                            <Button onClick={handleOpenGithubTool} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white">
                                <Github className="mr-2 h-4 w-4" />
                                Run by tool
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>

    )
}
export default Editor;
