export class GitHubClient {
  private static async request<TResponse>(
    endpoint: string,
    options: RequestInit,
  ): Promise<TResponse> {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {}
      throw new Error(`GitHub API Error (${response.status}): ${errorMessage}`);
    }
    return response.json();
  }

  protected static get<TResponse>(endpoint: string, headers?: HeadersInit) {
    return this.request<TResponse>(endpoint, {
      method: "GET",
      headers: { Accept: "application/vnd.github.v3+json", ...headers },
    });
  }

  protected static put<TResponse, TBody>(
    endpoint: string,
    body: TBody,
    headers?: HeadersInit,
  ) {
    return this.request<TResponse>(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  public static async getFileSha(token: string, owner: string, repo: string, path: string): Promise<string | null> {
    const file = await this.getFileContent(token, owner, repo, path);
    return file ? file.sha : null;
  }

  public static async getFileContent(token: string, owner: string, repo: string, path: string): Promise<{ sha: string, content: string } | null> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: "GET",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        }
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to fetch file info: ${response.statusText}`);

      const data = await response.json();
      let content = "";
      if (data.content && data.encoding === "base64") {
        content = Buffer.from(data.content, 'base64').toString('utf8');
      }

      return { sha: data.sha, content: content };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) return null;
      throw error;
    }
  }

  public static async uploadFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    base64Content: string,
    commitMessage: string,
    sha?: string | null
  ): Promise<any> {
    const body: any = { message: commitMessage, content: base64Content };
    if (sha) body.sha = sha;

    return this.put<any, any>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      body,
      { Authorization: `token ${token}` }
    );
  }
}
