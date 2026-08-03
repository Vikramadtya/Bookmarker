/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Bookmark } from "../models/Bookmark";
import type { BookmarkCreate } from "../models/BookmarkCreate";
import type { Folder } from "../models/Folder";
import type { FolderCreate } from "../models/FolderCreate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DefaultService {
  /**
   * Initiate Google OAuth
   * @returns void
   * @throws ApiError
   */
  public static authControllerGoogleAuth(): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/auth/google",
      errors: {
        302: `Redirects to Google`,
      },
    });
  }
  /**
   * Google OAuth Callback
   * @returns void
   * @throws ApiError
   */
  public static authControllerGoogleAuthRedirect(): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/auth/google/callback",
      errors: {
        302: `Redirects to frontend`,
      },
    });
  }
  /**
   * Check Auth Status
   * @returns any Returns user info if authenticated
   * @throws ApiError
   */
  public static authControllerStatus(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/auth/status",
    });
  }
  /**
   * Logout
   * @returns void
   * @throws ApiError
   */
  public static authControllerLogout(): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/auth/logout",
      errors: {
        302: `Redirects to frontend`,
      },
    });
  }
  /**
   * Get all folders
   * @returns Folder A list of folders
   * @throws ApiError
   */
  public static foldersControllerFindAll(): CancelablePromise<Array<Folder>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folders",
    });
  }
  /**
   * Create a new folder
   * @param requestBody
   * @returns Folder Folder created
   * @throws ApiError
   */
  public static createFolder(
    requestBody: FolderCreate
  ): CancelablePromise<Folder> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/folders",
      body: requestBody,
      mediaType: "application/json",
    });
  }
  /**
   * Get a folder by ID
   * @param id
   * @returns Folder Folder details
   * @throws ApiError
   */
  public static getFolderById(id: string): CancelablePromise<Folder> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folders/{id}",
      path: {
        id: id,
      },
      errors: {
        404: `Folder not found`,
      },
    });
  }
  /**
   * Update a folder
   * @param id
   * @param requestBody
   * @returns Folder Folder updated
   * @throws ApiError
   */
  public static updateFolder(
    id: string,
    requestBody: FolderCreate
  ): CancelablePromise<Folder> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/folders/{id}",
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }
  /**
   * Delete a folder
   * @param id
   * @returns void
   * @throws ApiError
   */
  public static deleteFolder(id: string): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/folders/{id}",
      path: {
        id: id,
      },
    });
  }
  /**
   * Get child folders
   * @param id
   * @returns Folder List of child folders
   * @throws ApiError
   */
  public static getFolderChildren(
    id: string
  ): CancelablePromise<Array<Folder>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folders/{id}/children",
      path: {
        id: id,
      },
    });
  }
  /**
   * Get all bookmarks, optionally filtered by folder
   * @param folderId ID of the folder to filter by. Use 'root' for unassigned bookmarks.
   * @returns Bookmark A list of bookmarks
   * @throws ApiError
   */
  public static getBookmarks(
    folderId?: string
  ): CancelablePromise<Array<Bookmark>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bookmarks",
      query: {
        folderId: folderId,
      },
    });
  }
  /**
   * Create a new bookmark
   * If only bookmarkURL is provided, the backend will scrape the page to fill in the missing details (title, description, logo).
   * @param requestBody
   * @returns Bookmark Bookmark created
   * @throws ApiError
   */
  public static createBookmark(
    requestBody: BookmarkCreate
  ): CancelablePromise<Bookmark> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/bookmarks",
      body: requestBody,
      mediaType: "application/json",
    });
  }
  /**
   * Get a bookmark by ID
   * @param id
   * @returns Bookmark Bookmark details
   * @throws ApiError
   */
  public static getBookmarkById(id: string): CancelablePromise<Bookmark> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bookmarks/{id}",
      path: {
        id: id,
      },
      errors: {
        404: `Bookmark not found`,
      },
    });
  }
  /**
   * Update a bookmark
   * @param id
   * @param requestBody
   * @returns Bookmark Bookmark updated
   * @throws ApiError
   */
  public static updateBookmark(
    id: string,
    requestBody: BookmarkCreate
  ): CancelablePromise<Bookmark> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/bookmarks/{id}",
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }
  /**
   * Delete a bookmark
   * @param id
   * @returns void
   * @throws ApiError
   */
  public static deleteBookmark(id: string): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/bookmarks/{id}",
      path: {
        id: id,
      },
    });
  }
}
