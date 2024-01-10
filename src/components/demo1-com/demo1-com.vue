<template>
  <div class="shade">
    <!-- 弹窗 -->
    <div class="modal">
      <div class="modal-title">
        <span>标题demo1</span>
        <span class="close" @click="close">X</span>
      </div>
      <div class="modal-content">
        <p>内容</p>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
    },
    data() {
      return {
        demo1: 'demo1'
      }
    },
    methods: {
      getDemo1() {
        console.log(this.demo1)
      },
      close() {
        this.$emit('close')
      }
    }
  }
</script>

<style lang="scss" scoped>
.shade {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: relative;

  .modal {
    width: 80%;
    height: 200px;
    background-color: #fff;
    border-radius: 10px;
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 10px #ccc;

    .modal-title {
      height: 40px;
      line-height: 40px;
      padding: 0 10px;
      border-bottom: 1px solid #ccc;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .close {
        cursor: pointer;
      }
    }

    .modal-content {
      padding: 10px;
      height: 160px;
      overflow: auto;
    }
  }
}
</style>
