---
title: 一个简易的 Go Pool 的设计与实现
published: 2021-02-25
description: ""
image: "/gallery/thumbnails/Goroutine.png"
tags: ["并发", "模式设计", "Go"]
category: "工具"
draft: false
---

# Goroutine 的优势和缺陷

Goroutine 是 Go 语言内部实现的高并发协程模型，并且可以通过 Channel 进行快捷便利的通信。

但是也有一些缺陷：一，不支持限制 Goroutine 的数量。二，在运行完毕之后不会立即被GC（Garbage Collection）回收。 

[👉More About Goroutine](https://medium.com/@riteeksrivastava/a-complete-journey-with-goroutines-8472630c7f5cs)



# Go Pool

![Diagram](/gallery/others/GoPool.png)

Pool 中主要包含三种部件：

1. Worker - 实际执行函数
2.  JobsChan - 将 job 提交给 Worker 
3. TasksChan - 用户将任务提交到 TasksChan，Pool 再将任务提交到 JobsChan。

另外需要定义 Task 结构，至少应该包含需要执行的函数。一个样例如下:

1. fn - 需要执行的函数
2. submitTime - 提交时间
3. User - 提交用户
4. taskId - 任务ID
5. …

通过Pool，我们可以限制goroutine的数量，并且可以复用goroutine。在一些并发量极大，单个goroutine执行任务并不繁重的情况下，可以节约很多内存。

因为虽然goroutine的初始内存只有2kb，但是如果并发量达到十万、百万级别，内存的消耗也是不容小觑的。当任务并不繁重时，一些goroutine可能被初始化之后，只执行了几行代码就被搁置了，但没有及时的GC。大量的died goroutine不必要地占用了大量内存资源。池化后，可以达到线程复用，从而节约内存。

# Implementation

```go
// The implementaion of a simple goroutines pool with fixed capacity
// By dicer 2/25/2021

package main

import (
   "fmt"
   "time"
)

// Define Task
type Task struct{
   fn func() error
   submitTime time.Time
   // Alternative property
   // #user
   // #taskID
}

// Return a new task with a function argFn
func NewTask(argFn func() error) *Task {
   t := Task{
      fn:         argFn,
      submitTime: time.Now(),
   }
   return &t
}

// Execute the fn of a Task
func (t *Task) Execute() {
   t.fn()
}

// Define Pool
type Pool struct {
   TasksChan chan *Task
   JobsChan chan *Task
   Cap uint
}

// Return a new pool with fixed capacity
func NewPool(cap uint) *Pool {
   p := Pool{
      TasksChan: make(chan *Task, cap),
      JobsChan: make(chan *Task, cap),
      Cap: cap,
   }
   return &p
}

// Generate a worker entity used as a coroutine
func (p *Pool) Worker(WorkerID int) {
   // take a task from JobsChan
   for t := range p.JobsChan {
      // execute this task
      t.Execute()
      // print info
      fmt.Printf("Worker %d has finished a task submited at %v.\n", WorkerID, t.submitTime)
   }
}

// Run the pool with cap_size worker
func (p *Pool) Run() {

   for i := 0; uint(i) < p.Cap; i++ {
      go p.Worker(i)
   }

   for  {
      p.JobsChan <- <- p.TasksChan
   }
   fmt.Println("Debug")
}

// Test the Pool
func main() {
   t := NewTask(func() error {
      _, err := fmt.Println(time.Now())
      return err
   })

   p := NewPool(5)
   go p.Run()

   for {
      p.TasksChan <- t
   }
}
```

