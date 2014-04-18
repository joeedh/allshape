from auth import AuthAPI_RefreshToken_WPHack, AuthAPI_OAuthStart, AuthAPI_GetUserInfo, AuthAPI_RefreshToken, AuthAPI_SessionToken
from fileapi import FileAPI_DirList, FileAPI_GetMeta, FileAPI_UploadStart, FileAPI_UploadChunk, FileAPI_GetFile

api_handlers = {
  "/api/files/dir/list"     : FileAPI_DirList,
  "/api/files/get/meta"     : FileAPI_GetMeta,
  "/api/files/get"          : FileAPI_GetFile,
  "/api/auth"               : AuthAPI_RefreshToken,
  "/api/auth/session"       : AuthAPI_SessionToken,
  "/api/auth/userinfo"      : AuthAPI_GetUserInfo,
  "/api/files/upload/start" : FileAPI_UploadStart,
  "/api/files/upload"       : FileAPI_UploadChunk,
  "/api/auth/oauth"         : AuthAPI_OAuthStart,
  "/api/auth/wpauthhack"    : AuthAPI_RefreshToken_WPHack
}
