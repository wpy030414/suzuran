<template>
  <v-container>
    <h2 class="text-h5 mb-4">层级管理</h2>

    <v-row>
      <v-col cols="12" md="5">
        <v-card>
          <v-card-title>组织树</v-card-title>
          <v-card-text>
            <v-btn color="primary" @click="openAdd('campus', null)" class="mb-2" size="small">新增校区</v-btn>
            <v-btn color="secondary" @click="loadTree" size="small" class="mb-2 ml-2">刷新</v-btn>

            <div v-if="tree.length === 0" class="text-center pa-4">暂无层级数据，请先添加校区</div>

            <v-list v-else density="compact">
              <template v-for="campus in tree" :key="campus.id">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-school</v-icon>
                  </template>
                  <v-list-item-title>{{ campus.campus_name }}</v-list-item-title>
                  <template v-slot:append>
                    <v-btn size="small" color="primary" variant="text" @click="openAdd('grade', campus.id)">+ 年级</v-btn>
                    <v-btn size="small" color="error" variant="text" @click="removeNode(campus.id)">删除</v-btn>
                  </template>
                </v-list-item>

                <v-list v-if="campus.children && campus.children.length > 0" class="ml-6">
                  <template v-for="grade in campus.children" :key="grade.id">
                    <v-list-item>
                      <template v-slot:prepend>
                        <v-icon color="secondary">mdi-domain</v-icon>
                      </template>
                      <v-list-item-title>{{ grade.grade_name }}</v-list-item-title>
                      <template v-slot:append>
                        <v-btn size="small" color="primary" variant="text" @click="openAdd('class', grade.id)">+ 班级</v-btn>
                        <v-btn size="small" color="error" variant="text" @click="removeNode(grade.id)">删除</v-btn>
                      </template>
                    </v-list-item>

                    <v-list v-if="grade.children && grade.children.length > 0" class="ml-6">
                      <v-list-item v-for="cls in grade.children" :key="cls.id">
                        <template v-slot:prepend>
                          <v-icon color="tertiary">mdi-account-group</v-icon>
                        </template>
                        <v-list-item-title>{{ cls.class_name }}</v-list-item-title>
                        <template v-slot:append>
                          <v-btn size="small" color="error" variant="text" @click="removeNode(cls.id)">删除</v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                  </template>
                </v-list>
              </template>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card>
          <v-card-title>新增节点</v-card-title>
          <v-card-text>
            <v-alert type="info" class="mb-4">
              当前添加: {{ levelText }} , 父节点ID: {{ form.parent_id || '无' }}
            </v-alert>
            <v-text-field v-model="form.campus_name" label="校区名称" :disabled="form.level !== 'campus'" />
            <v-text-field v-model="form.grade_name" label="年级名称" :disabled="form.level !== 'grade'" />
            <v-text-field v-model="form.class_name" label="班级名称" :disabled="form.level !== 'class'" />
            <v-btn color="primary" @click="save" class="mt-2">保存</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const tree = ref([])
const form = ref({ level: 'campus', parent_id: null, campus_name: '', grade_name: '', class_name: '' })

const levelText = computed(() => ({
  campus: '校区',
  grade: '年级',
  class: '班级'
})[form.value.level] || form.value.level)

function openAdd(level, parentId) {
  form.value = {
    level,
    parent_id: parentId,
    campus_name: '',
    grade_name: '',
    class_name: ''
  }
}

async function loadTree() {
  try {
    tree.value = await api.getCampusTree()
  } catch (e) {
    tree.value = []
  }
}

async function save() {
  const data = { level: form.value.level, parent_id: form.value.parent_id }
  if (form.value.level === 'campus') {
    if (!form.value.campus_name) return alert('请输入校区名称')
    data.campus_name = form.value.campus_name
  } else if (form.value.level === 'grade') {
    if (!form.value.grade_name) return alert('请输入年级名称')
    data.grade_name = form.value.grade_name
    // 继承父校区的名称
    const campus = findNode(tree.value, form.value.parent_id)
    if (campus) data.campus_name = campus.campus_name
  } else if (form.value.level === 'class') {
    if (!form.value.class_name) return alert('请输入班级名称')
    data.class_name = form.value.class_name
  }

  await api.createCampusNode(data)
  await loadTree()
  form.value = { level: 'campus', parent_id: null, campus_name: '', grade_name: '', class_name: '' }
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

async function removeNode(id) {
  if (confirm('确定删除此节点及其所有子节点？')) {
    await api.deleteCampusNode(id)
    await loadTree()
  }
}

onMounted(loadTree)
</script>
