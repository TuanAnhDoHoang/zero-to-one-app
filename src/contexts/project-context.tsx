import * as React from 'react';
import { useAuth } from './auth-context';
import type { Project } from '@/models/project';
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from '@mysten/dapp-kit';
import { SealClient, SessionKey } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { randomBytes } from 'crypto';

interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  createProject: (projectData: Partial<Project>) => Promise<Project | undefined>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  uploadPrototype: (uploadData: { project: Project; address: string }) => Promise<any>;
  addProject: (project: Project) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = React.createContext<ProjectContextType | undefined>(
  undefined
);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const endpoint = import.meta.env.VITE_ENDPOINT;
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const suiClient = useSuiClient();

  //seal
  const serverObjectIds = ["0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8"];
  const client = new SealClient({
    suiClient,
    serverConfigs: serverObjectIds.map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  const currAccount = useCurrentAccount();

  const loadProjects = React.useCallback(async () => {
    if (!isAuthenticated || !token) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${endpoint}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.projects) {
          setProjects(
            data.projects.map((p: any) => ({
              id: p.id,
              name: p.name,
              ideaDescription: p.ideaDescription || '',
              guidedQuestions: p.guidedQuestions,
              prototypeCode: p.prototypeCode,
              projectFiles: p.projectFiles,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = React.useCallback(
    async (projectData: Partial<Project>) => {
      if (!token) {
        console.error('No token available for creating project.');
        return;
      }
      let quiltIdStr = "";
      let sealIdHex = "";

      try {
        if (projectData.projectFiles && projectData.projectFiles.length > 0) {
          const protectedData = {
            projectFiles: projectData.projectFiles,
            prototypeCode: projectData.prototypeCode
          };
          const jsonString = JSON.stringify(protectedData);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const fileToEncrypt = new File([blob], "project_data.json", { type: 'application/json' });

          const sealId = randomBytes(32);
          sealIdHex = toHex(sealId);

          const { encryptedBytes } = await encryptFile(fileToEncrypt, sealId);

          if (currAccount?.address) {
            const uploadResponse = await fetch(`${endpoint}/projects/upload-file`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ encryptedBytes, address: currAccount.address }),
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              if (uploadData.success && uploadData.response) {
                quiltIdStr = uploadData.response;
              }
            } else {
              console.error('Failed to upload encrypted data to Walrus');
            }
          }
        }

        const response = await fetch(`${endpoint}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: projectData.name,
            ideaDescription: projectData.ideaDescription,
            guidedQuestions: projectData.guidedQuestions || [],
            prototypeCode: "",
            projectFiles: [],
            quiltId: quiltIdStr,
            sealId: sealIdHex
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.project) {
            const newProject: Project = {
              id: data.project.id,
              name: data.project.name,
              ideaDescription: data.project.ideaDescription || '',
              quiltId: data.project.quiltId,
              sealId: data.project.sealId
            };
            setProjects((prev) => [newProject, ...prev]);
            return newProject;
          }
        } else {
          console.error('Failed to create project:', await response.text());
        }
      } catch (error) {
        console.error('Error creating project:', error);
      }
    },
    [token, endpoint, client, currAccount]
  );

  const updateProject = React.useCallback(
    async (id: string, updates: Partial<Project>) => {
      if (!token) return;
      try {
        const response = await fetch(`${endpoint}/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
        if (response.ok) {
          setProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
          );
        }
      } catch (error) {
        console.error('Error updating project:', error);
      }
    },
    [token]
  );

  const deleteProject = React.useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const response = await fetch(`${endpoint}/projects/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          setProjects((prev) => prev.filter((p) => p.id !== id));
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    },
    [token]
  );

  const uploadPrototype = React.useCallback(async (uploadData: { project: Project; address: string }) => {
    if (!token) return;
    if (!uploadData.project) {
      console.error('No project data available for upload.');
      return;
    }
    try {
      const response = await fetch(`${endpoint}/projects/upload-prototype`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project: uploadData.project,
          address: uploadData.address,
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error uploading prototype:', error);
    }
  }, [token]);

  const addProject = React.useCallback((project: Project) => {
    setProjects((prev) => [...prev, project]);
  }, []);

  const refreshProjects = React.useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);
  const getSessionKey = async () => {
    if (!currAccount) {
      console.error('No current account found');
      return;
    }
    const pid = import.meta.env.VITE_PID;
    const sessionKey = await SessionKey.create({
      address: currAccount.address,
      packageId: pid,
      ttlMin: 30, // TTL of 30 minutes
      suiClient: suiClient,
    });
    const message = sessionKey.getPersonalMessage();

    await new Promise<void>((resolve, reject) => {
      signPersonalMessage({ message: message }, {
        onSuccess: async (result) => {
          await sessionKey.setPersonalMessageSignature(result.signature);
          resolve();
        },
        onError: (error) => {
          console.error('Failed to sign personal message:', error);
          reject(error);
        },
      });
    });
    return sessionKey;
  }
  const encryptFile = async (file: File, sealId: Uint8Array) => {
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const { encryptedObject: encryptedBytes, key: backupKey } = await client.encrypt({
      threshold: 1,
      packageId: toHex(fromHex(import.meta.env.VITE_PID)),
      id: toHex(sealId),
      data: fileBytes
    });
    return { encryptedBytes, backupKey };
  }
  return (
    <ProjectContext.Provider
      value={{
        projects,
        setProjects,
        updateProject,
        createProject,
        deleteProject,
        uploadPrototype,
        addProject,
        isLoading,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = React.useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}