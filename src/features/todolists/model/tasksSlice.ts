import { asyncThunkCreator, buildCreateSlice } from "@reduxjs/toolkit"
import { ResultCode } from "common/enums"
import { handleServerAppError, handleServerNetworkError } from "common/utils"
import { setAppError, setAppStatus } from "../../../app/appSlice"
import { RootState } from "../../../app/store"
import { tasksApi } from "../api/tasksApi"
import { DomainTask, UpdateTaskDomainModel, UpdateTaskModel } from "../api/tasksApi.types"
import { addTodolist, removeTodolist } from "./todolistsSlice"

export type TasksStateType = {
  [key: string]: DomainTask[]
}
const createSliceWithThunks = buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } }) //Thunk 2.0

export const tasksSlice = createSliceWithThunks({
  name: "tasks",
  initialState: {} as TasksStateType,
  reducers: (create) => {
    const createAThunk = create.asyncThunk.withTypes<{ rejectValue: null }>()
    return {
      // setTasks: create.reducer<{ todolistId: string; tasks: DomainTask[] }>((state, action) => {
      //   state[action.payload.todolistId] = action.payload.tasks
      // }),
      // removeTask: create.reducer<{ taskId: string; todolistId: string }>((state, action) => {
      //   const tasks = state[action.payload.todolistId]
      //   const index = tasks.findIndex((t) => t.id === action.payload.taskId)
      //   if (index !== -1) {
      //     tasks.splice(index, 1)
      //   }
      // }),
      // addTask: create.reducer<{ task: DomainTask }>((state, action) => {
      //   const tasks = state[action.payload.task.todoListId]
      //   tasks.unshift(action.payload.task)
      // }),
      // updateTask: create.reducer<{ taskId: string; todolistId: string; domainModel: UpdateTaskDomainModel }>(
      //   (state, action) => {
      //     const tasks = state[action.payload.todolistId]
      //     const index = tasks.findIndex((t) => t.id === action.payload.taskId)
      //     if (index !== -1) {
      //       tasks[index] = { ...tasks[index], ...action.payload.domainModel }
      //     }
      //   },
      // ),
      clearTasks: create.reducer(() => {
        return {}
      }),
      //Thunk 2.0
      fetchTasks: createAThunk(
        async (todolistId: string, { dispatch, rejectWithValue, getState }) => {
          const isLoggedIn = (getState() as RootState).auth.isLoggedIn // типизация getState
          try {
            dispatch(setAppStatus({ status: 'loading' }))
            const res = await tasksApi.getTasks(todolistId)
            dispatch(setAppStatus({ status: 'succeeded' }))
            return { todolistId, tasks: res.data.items }
          } catch (error) {
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
        {
          fulfilled: (state, action) => {
            state[action.payload.todolistId] = action.payload.tasks
          },
        }
      ),

      removeTask: createAThunk(
        async (arg: {todolistId: string, taskId: string}, {dispatch, rejectWithValue}) => {
          try{
            dispatch(setAppStatus({ status: "loading" }))
            const res = await tasksApi.deleteTask(arg)
            if(res.data.resultCode === ResultCode.Success){
              dispatch(setAppStatus({ status: "succeeded" }))
              return arg
            } else {
              handleServerAppError(res.data, dispatch)
              return rejectWithValue(null)
            }
          } catch(error){
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
        {
          fulfilled: (state, action) => {
              const tasks = state[action.payload.todolistId]
              const index = tasks.findIndex((t) => t.id === action.payload.taskId)
              if (index !== -1) {
                tasks.splice(index, 1)
              }
          },
        }
      ),

      addTask: createAThunk(
        async (arg: { title: string; todolistId: string }, {dispatch, rejectWithValue}) => {
          try{
            dispatch(setAppStatus({ status: "loading" }))
            const res = await tasksApi.createTask(arg)
            if(res.data.resultCode === ResultCode.Success){
              dispatch(setAppStatus({ status: "succeeded" }))
              return {task: res.data.data.item}
            } else {
              handleServerAppError(res.data, dispatch)
              return rejectWithValue(null)
            }
          } catch (error){
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        }, {
          fulfilled: (state, action) => {
              const tasks = state[action.payload.task.todoListId] //вернет массив тасок
              tasks.unshift(action.payload.task)
          }
        }
      ),
      updateTask: createAThunk(
        async (arg: { taskId: string; todolistId: string; domainModel: UpdateTaskDomainModel }, {dispatch, rejectWithValue, getState}) => {
          try{
          const { taskId, todolistId, domainModel } = arg

          const allTasksFromState = (getState() as RootState).tasks
          const tasksForCurrentTodolist = allTasksFromState[todolistId]
          const task = tasksForCurrentTodolist.find((t) => t.id === taskId)

          if(!task){
            dispatch(setAppError({ error: "Task not found" }))
            return rejectWithValue(null)
          }

          const model: UpdateTaskModel = {
            status: task.status,
            title: task.title,
            deadline: task.deadline,
            description: task.description,
            priority: task.priority,
            startDate: task.startDate,
            ...domainModel,
          }

          dispatch(setAppStatus({ status: "loading" }))

          const res = await tasksApi.updateTask({todolistId, taskId, model})
            if(res.data.resultCode === ResultCode.Success){
              dispatch(setAppStatus({ status: "succeeded" }))
              return arg
            } else {
              handleServerAppError(res.data, dispatch)
              return rejectWithValue(null)
            }
          }catch (error){
            handleServerNetworkError(error, dispatch)
            return rejectWithValue(null)
          }
        },
    {
        fulfilled: (state, action) => {
          const tasks = state[action.payload.todolistId]
          const index = tasks.findIndex((t) => t.id === action.payload.taskId)
          if (index !== -1) {
            tasks[index] = { ...tasks[index], ...action.payload.domainModel }
          }
        },
      }
      ),
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(addTodolist.fulfilled, (state, action) => {
        state[action.payload.todolist.id] = []
      })
      .addCase(removeTodolist.fulfilled, (state, action) => {
        delete state[action.payload.id]
      })

      // до RTK 2.0
      // .addCase(fetchTasks.fulfilled, (state, action) => {
      //   state[action.payload.todolistId] = action.payload.tasks
      // })
      // .addCase(fetchTasks.rejected, (state, action) => {
      //   //можно здесь обработать ошибку
      // // state.error = action.payload.error.message
      // })
  },
  selectors: {
    selectTasks: (state) => state,
  },
})

// Thunks

// //до RTK 2.0
// export const fetchTasks = createAppAsyncThunk<{ todolistId: string; tasks: DomainTask[] }, string>(`${tasksSlice.name}/fetchTasks`, async (todolistId, thunkAPI) => {
//   //типизация createAsyncThunk 1- что возвращает, 2 - что принимает, 3 - конфигурация
//
//   // 1 - prefix
//   // 2 - callback (условно наша старая санка), в которую:
//   // первым параметром мы передаем параметры необходимые для санки
//   // (если параметров больше чем один упаковываем их в объект)
//   // Вторым параметром является thunkAPI, обратившись к которому получим dispatch, getState и пр.
//
//   const {dispatch, rejectWithValue} = thunkAPI
//   try {
//     dispatch(setAppStatus({ status: "loading" }))
//     const res = await tasksApi.getTasks(todolistId)
//     dispatch(setAppStatus({ status: "succeeded" }))
//
//     //санка будет сама создавать action и соответственно не надо писать экшены руками
//     return { todolistId, tasks: res.data.items }
//   }
//   catch (error) {
//     handleServerNetworkError(error, dispatch)
//     return rejectWithValue(null) // заглушка, на самом деле не исользуется, но для типизации нужен
//     //rejectWithValue is a utility function that you can return (or throw) in your action creator to return a rejected response with a defined payload and meta
//   }
// })


//старый синтаксис
// export const fetchTasksTC = (todolistId: string) => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   tasksApi
//     .getTasks(todolistId)
//     .then((res) => {
//       dispatch(setAppStatus({ status: "succeeded" }))
//       dispatch(setTasks({ todolistId, tasks: res.data.items }))
//     })
//     .catch((error) => {
//       handleServerNetworkError(error, dispatch)
//     })
// }

// export const removeTaskTC = (arg: { taskId: string; todolistId: string }) => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   tasksApi
//     .deleteTask(arg)
//     .then((res) => {
//       if (res.data.resultCode === ResultCode.Success) {
//         dispatch(setAppStatus({ status: "succeeded" }))
//         dispatch(removeTask(arg))
//       } else {
//         handleServerAppError(res.data, dispatch)
//       }
//     })
//     .catch((error) => {
//       handleServerNetworkError(error, dispatch)
//     })
// }

// export const addTaskTC = (arg: { title: string; todolistId: string }) => (dispatch: Dispatch) => {
//   dispatch(setAppStatus({ status: "loading" }))
//   tasksApi
//     .createTask(arg)
//     .then((res) => {
//       if (res.data.resultCode === ResultCode.Success) {
//         dispatch(setAppStatus({ status: "succeeded" }))
//         dispatch(addTask({ task: res.data.data.item }))
//       } else {
//         handleServerAppError(res.data, dispatch)
//       }
//     })
//     .catch((error) => {
//       handleServerNetworkError(error, dispatch)
//     })
// }

// export const updateTaskTC =
//   (arg: { taskId: string; todolistId: string; domainModel: UpdateTaskDomainModel }) =>
//   (dispatch: Dispatch, getState: () => RootState) => {
//     const { taskId, todolistId, domainModel } = arg
//
//     const allTasksFromState = getState().tasks
//     const tasksForCurrentTodolist = allTasksFromState[todolistId]
//     const task = tasksForCurrentTodolist.find((t) => t.id === taskId)
//
//     if (task) {
//       const model: UpdateTaskModel = {
//         status: task.status,
//         title: task.title,
//         deadline: task.deadline,
//         description: task.description,
//         priority: task.priority,
//         startDate: task.startDate,
//         ...domainModel,
//       }
//
//       dispatch(setAppStatus({ status: "loading" }))
//       tasksApi
//         .updateTask({ taskId, todolistId, model })
//         .then((res) => {
//           if (res.data.resultCode === ResultCode.Success) {
//             dispatch(setAppStatus({ status: "succeeded" }))
//             dispatch(updateTask(arg))
//           } else {
//             handleServerAppError(res.data, dispatch)
//           }
//         })
//         .catch((error) => {
//           handleServerNetworkError(error, dispatch)
//         })
//     }
//   }

export const { fetchTasks, removeTask, addTask, clearTasks, updateTask } = tasksSlice.actions
export const { selectTasks } = tasksSlice.selectors
export const tasksReducer = tasksSlice.reducer
