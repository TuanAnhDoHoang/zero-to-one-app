import * as React from 'react';
import { useAuth } from './auth-context';
import type { Project } from '@/models/project';

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
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: projectData.name,
            ideaDescription: projectData.ideaDescription,
            guidedQuestions: projectData.guidedQuestions || [],
            prototypeCode: projectData.prototypeCode || "",
            projectFiles: projectData.projectFiles || []
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.project) {
            const newProject: Project = {
              id: data.project.id,
              name: data.project.name,
              ideaDescription: data.project.ideaDescription || '',
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
    [token]
  );

  const updateProject = React.useCallback(
    async (id: string, updates: Partial<Project>) => {
      if (!token) return;
      try {
        const response = await fetch(`/api/projects/${id}`, {
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
        const response = await fetch(`/api/projects/${id}`, {
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
      const response = await fetch(`/api/projects/upload-prototype`, {
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