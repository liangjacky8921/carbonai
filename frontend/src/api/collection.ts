import { http } from './client'
export interface SourceArchive { id: number; name: string; origin: string; authorization: string; is_sample: boolean; status: 'pending' | 'verified'; verification_note: string }
export interface CaptureRecord { id: number; code: string; kind: string; source_id: number; nature: string; captured_at: string; longitude: number | null; latitude: number | null; note: string; photo_name: string | null; photo_sha256: string | null; photo_url: string | null }
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('carbonai_jwt') || ''}` })
export const collectionApi = {
  sources: async () => (await http.get<{items: SourceArchive[]}>('/collection/sources', { headers: headers() })).data,
  source: async (body: {name:string;origin:string;authorization:string;is_sample:boolean}) => (await http.post<SourceArchive>('/collection/sources', body, { headers: headers() })).data,
  review: async (id:number,status:string,note:string) => (await http.patch(`/collection/sources/${id}`, {status,note}, {headers:headers()})).data,
  records: async (offset=0) => (await http.get<{items:CaptureRecord[];total:number}>('/collection/records', {headers:headers(),params:{offset,limit:20}})).data,
  save: async (body:FormData) => (await http.post('/collection/records',body,{headers:headers(),timeout:30000})).data,
  photo: async (id:number,signal?:AbortSignal) => (await http.get<Blob>(`/collection/records/${id}/photo`, {headers:headers(),responseType:'blob',signal})).data,
}
