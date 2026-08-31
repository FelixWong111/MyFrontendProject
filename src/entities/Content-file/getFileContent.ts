import { httpClient } from "@/shared/api/httpClient";

export interface FileContent{
    blob:Blob,
    contentType?:string,
    contentLength?:string,
    contentDisposition?:string
}

export async function getFileContent(fileId:string):Promise<FileContent>{
    const response = await httpClient.get<Blob>(
        `/api/v1/files/${fileId}/content`,
        {
            responseType:"blob"
        }
    )

    return {
        blob:response.data,
        contentType:response.headers["content-type"]?.toString(),
        contentLength:response.headers["content-length"]?.toString(),
        contentDisposition:response.headers["content-disposition"]?.toString()
    }
}
//headers可以有很多类型，直接定义?:string会报错，因为不能保证都是string类型