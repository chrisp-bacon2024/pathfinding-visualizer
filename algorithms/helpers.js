export const terrainCosts = {
    "grass": 2,
    "road": 1,
    "mud": 5,
    "end": 0
}

export const directions = [
    [0, -1], // Left
    [1, 0], // Down
    [0, 1], // Right
    [-1, 0], // Up
]

export function reconstructPath(cameFrom, start, end, steps){
    let path = [];
    let node = cameFrom.get(end);
    while (node !== start){
        path.push(node);
        node = cameFrom.get(node);
    }

    path.reverse().forEach(node => {
        steps.push({cell: node, state: "path"});
    });
};

export function destinationDistance(cell, destination){
    return Math.abs(cell.row - destination.row) + Math.abs(cell.col - destination.col);
};

export class MinHeap{
    constructor(){
        this.heap = []
    }
    isEmpty(){
        return this.heap.length === 0;
    }
    push(priority, cell){
        this.heap.push({priority: priority, cell: cell})
        let childIndex = this.heap.length - 1;
        let parentIndex = Math.floor((childIndex - 1)/2);
        while (parentIndex >= 0){
            if (this.heap[childIndex].priority < this.heap[parentIndex].priority){
                [this.heap[parentIndex], this.heap[childIndex]] = [this.heap[childIndex], this.heap[parentIndex]]
                childIndex = parentIndex;
                parentIndex = Math.floor((childIndex - 1)/2);
            } else {
                break
            }
        }
    }
    pop(){
        if (this.heap.length <= 1){
            return this.heap.pop()
        } 
        const minVal = this.heap[0]
        this.heap[0] = this.heap.pop()

        let parentInd = 0;
        let parent;
        let leftInd, rightInd;
        let leftChild, rightChild;
        while (parentInd < this.heap.length){
            parent = this.heap[parentInd];
            leftInd = parentInd * 2 + 1;
            if (leftInd < this.heap.length){
                leftChild = this.heap[leftInd]
            } else {
                leftChild = {priority: Infinity, cell:null}
            }
            rightInd = parentInd * 2 + 2
            if (rightInd < this.heap.length){
                rightChild = this.heap[rightInd]
            } else {
                rightChild = {priority: Infinity, cell:null}
            }

            if (parent.priority > leftChild.priority || parent.priority > rightChild.priority){
                if (leftChild.priority < rightChild.priority){
                    this.heap[leftInd] = parent;
                    this.heap[parentInd] = leftChild;
                    parentInd = leftInd;
                } else {
                    this.heap[rightInd] = parent;
                    this.heap[parentInd] = rightChild;
                    parentInd = rightInd;
                }
            } else {
                break
            }
        }
        return minVal
    }
}