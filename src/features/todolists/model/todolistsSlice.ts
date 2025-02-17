import { asyncThunkCreator, buildCreateSlice } from "@reduxjs/toolkit"
import { ResultCode } from "common/enums"
import { handleServerAppError, handleServerNetworkError } from "common/utils"
import { RequestStatus, setAppStatus } from "../../../app/appSlice"
import { todolistsApi } from "../api/todolistsApi"
import { Todolist } from "../api/todolistsApi.types"

export type FilterValuesType = "all" | "active" | "completed"

export type DomainTodolist = Todolist & {
  filter: FilterValuesType
  entityStatus: RequestStatus
}
const createSliceWithThunks = buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } }) //Thunk 2.0

export const todolistsSlice = createSliceWithThunks({
  name: "todolists",
  initialState: [] as DomainTodolist[],
  reducers: (create) => {
    const createAThunk = create.asyncThunk.withTypes<{ rejectValue: null }>()
    return {
      // removeTodolist: create.reducer<{ id: string }>((state, action) => {
      //   const index = state.findIndex((tl) => tl.id === action.payload.id)
      //   if (index !== -1) {
      //     state.splice(index, 1)
      //   }
      // }),
    //     addTodolist: create.reducer<{ todolist: Todolist }>((state, action) => {
    //   state.unshift({ ...action.payload.todolist, filter: "all", entityStatus: "idle" })
    // }),
    //   changeTodolistTitle: create.reducer<{ id: string; title: string }>((state, action) => {
    //   const index = state.findIndex((tl) => tl.id === action.payload.id)
    //   if (index !== -1) {
    //     state[index].title = action.payload.title
    //   }
    // }),
      changeTodolistFilter: create.reducer<{ id: string; filter: FilterValuesType }>((state, action) => {
      const index = state.findIndex((tl) => tl.id === action.payload.id)
      if (index !== -1) {
        state[index].filter = action.payload.filter
      }
    }),
      changeTodolistEntityStatus: create.reducer<{ id: string; entityStatus: RequestStatus }>((state, action) => {
      const index = state.findIndex((tl) => tl.id === action.payload.id)
      if (index !== -1) {
        state[index].entityStatus = action.payload.entityStatus
      }
    }),
      // setTodolists: create.reducer<{ todolists: Todolist[] }>((state, action) => {
      //   return action.payload.todolists.map((tl) => ({ ...tl, filter: "all", entityStatus: "idle" }))
      // }),
      clearTodolists: create.reducer(() => {
      return []
    }),
      fetchTodolists: createAThunk(
        async ( _: void, { dispatch, rejectWithValue }) => {
          try{
            dispatch(setAppStatus({ status: "loading" }))
            const res = await todolistsApi.getTodolists()
            dispatch(setAppStatus({ status: "succeeded" }))
            return {todolists: res.data}
          }catch (error){
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
        {
          fulfilled: (state, action) => {
            return action.payload.todolists.map((tl) => ({ ...tl, filter: "all", entityStatus: "idle" }))
          },
        }
      ),
      removeTodolist: createAThunk(
        async(id: string, {dispatch, rejectWithValue}) => {
          try{
            dispatch(setAppStatus({ status: "loading" }))
            dispatch(changeTodolistEntityStatus({ id, entityStatus: "loading" }))
            const res = await todolistsApi.deleteTodolist(id)
            if (res.data.resultCode === ResultCode.Success) {
              dispatch(setAppStatus({ status: "succeeded" }))
              return {id}
            } else {
              handleServerAppError(res.data, dispatch)
              return rejectWithValue(null)
            }
          }catch(error){
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
        {
          fulfilled: (state, action) => {
              const index = state.findIndex((tl) => tl.id === action.payload.id)
              if (index !== -1) {
                state.splice(index, 1)
              }
          },
        }
      ),
      updateTodolistTitle: createAThunk(
        async (arg: { id: string; title: string }, {dispatch, rejectWithValue}) => {
          try {
            dispatch(setAppStatus({ status: "loading" }))
            const res = await todolistsApi.updateTodolist(arg)
            if (res.data.resultCode === ResultCode.Success) {
              dispatch(setAppStatus({ status: "succeeded" }))
              return arg
            } else {
              handleServerAppError(res.data, dispatch)
              return rejectWithValue(null)
            }
          }catch(error) {
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
        {
          fulfilled: (state, action) => {
              const index = state.findIndex((tl) => tl.id === action.payload.id)
              if (index !== -1) {
                state[index].title = action.payload.title
              }
          },
        }
      ),
      addTodolist: createAThunk(
        async (title: string, {dispatch, rejectWithValue}) => {
          try{
            dispatch(setAppStatus({ status: "loading" }))
            const res = await todolistsApi.createTodolist(title)
            if (res.data.resultCode === ResultCode.Success) {
              dispatch(setAppStatus({ status: "succeeded" }))
              return { todolist: res.data.data.item }
            } else {
              handleServerAppError(res.data, dispatch)
              return rejectWithValue(null)
            }

          }catch(error){
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
        {
          fulfilled: (state, action) => {
            state.unshift({ ...action.payload.todolist, filter: "all", entityStatus: "idle" })
          }
        }
      ),
    }
  },
  selectors: {
    selectTodolists: (state) => state,
  },
})

// Thunks
// export const fetchTodolistsTC = () => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   todolistsApi
//     .getTodolists()
//     .then((res) => {
//       dispatch(setAppStatus({ status: "succeeded" }))
//       dispatch(setTodolists({ todolists: res.data }))
//     })
//     .catch((error) => {
//       handleServerNetworkError(error, dispatch)
//     })
// }

// export const addTodolistTC = (title: string) => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   todolistsApi
//     .createTodolist(title)
//     .then((res) => {
//       if (res.data.resultCode === ResultCode.Success) {
//         dispatch(setAppStatus({ status: "succeeded" }))
//         dispatch(addTodolist({ todolist: res.data.data.item }))
//       } else {
//         handleServerAppError(res.data, dispatch)
//       }
//     })
//     .catch((error) => {
//       handleServerNetworkError(error, dispatch)
//     })
// }

// export const removeTodolistTC = (id: string) => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   dispatch(changeTodolistEntityStatus({ id, entityStatus: "loading" }))
//   todolistsApi
//     .deleteTodolist(id)
//     .then((res) => {
//       if (res.data.resultCode === ResultCode.Success) {
//         dispatch(setAppStatus({ status: "succeeded" }))
//         dispatch(removeTodolist({ id }))
//       } else {
//         handleServerAppError(res.data, dispatch)
//       }
//     })
//     .catch((error) => {
//       dispatch(changeTodolistEntityStatus({ id, entityStatus: "failed" }))
//       handleServerNetworkError(error, dispatch)
//     })
// }

// export const updateTodolistTitleTC = (arg: { id: string; title: string }) => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   todolistsApi
//     .updateTodolist(arg)
//     .then((res) => {
//       if (res.data.resultCode === ResultCode.Success) {
//         dispatch(setAppStatus({ status: "succeeded" }))
//         dispatch(changeTodolistTitle(arg))
//       } else {
//         handleServerAppError(res.data, dispatch)
//       }
//     })
//     .catch((error) => {
//       handleServerNetworkError(error, dispatch)
//     })
// }

export const {
  removeTodolist,
  addTodolist,
  changeTodolistEntityStatus,
  changeTodolistFilter,
  updateTodolistTitle,
  clearTodolists,
  fetchTodolists,
} = todolistsSlice.actions
export const { selectTodolists } = todolistsSlice.selectors
export const todolistsReducer = todolistsSlice.reducer
