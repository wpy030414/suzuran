<template>
  <v-container>
    <h2 class="text-h5 mb-4">系统配置</h2>

    <v-expansion-panels>
      <!-- 关爱级别配置 -->
      <v-expansion-panel>
        <v-expansion-panel-title>关爱级别配置</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-btn size="small" color="primary" @click="openLevelDialog" class="mb-2">新增级别</v-btn>
          <v-table density="compact">
            <thead>
              <tr>
                <th>级别名称</th>
                <th>关爱周期</th>
                <th>周期次数</th>
                <th>描述</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in careLevels" :key="l.id">
                <td>{{ l.level_name }}</td>
                <td>{{ l.period_type === 'month' ? '月' : '学期' }}</td>
                <td>{{ l.period_count }}</td>
                <td>{{ l.description }}</td>
                <td>
                  <v-btn size="small" icon="mdi-delete" color="error" @click="deleteLevel(l.id)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- 年级配置 -->
      <v-expansion-panel>
        <v-expansion-panel-title>年级配置</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-btn size="small" color="primary" @click="openGradeDialog" class="mb-2">新增年级</v-btn>
          <v-table density="compact">
            <thead>
              <tr>
                <th>年级名称</th>
                <th>年级主任</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in grades" :key="g.id">
                <td>{{ g.grade_name }}</td>
                <td>{{ g.director_name }}</td>
                <td>
                  <v-btn size="small" icon="mdi-delete" color="error" @click="deleteGrade(g.id)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- 班级配置 -->
      <v-expansion-panel>
        <v-expansion-panel-title>班级配置</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-btn size="small" color="primary" @click="openClassDialog" class="mb-2">新增班级</v-btn>
          <v-table density="compact">
            <thead>
              <tr>
                <th>年级</th>
                <th>班级名称</th>
                <th>班主任</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in classes" :key="c.id">
                <td>{{ gradeMap[c.grade_id]?.grade_name || '-' }}</td>
                <td>{{ c.class_name }}</td>
                <td>{{ c.teacher_name }}</td>
                <td>
                  <v-btn size="small" icon="mdi-delete" color="error" @click="deleteClass(c.id)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- 心理教师名单 -->
      <v-expansion-panel>
        <v-expansion-panel-title>心理教师名单</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-btn size="small" color="primary" @click="openPsyTeacherDialog" class="mb-2">添加心理教师</v-btn>
          <v-table density="compact">
            <thead>
              <tr>
                <th>教师姓名</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in psyTeachers" :key="t.id">
                <td>{{ t.teacher_name }}</td>
                <td>
                  <v-btn size="small" icon="mdi-delete" color="error" @click="deletePsyTeacher(t.id)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- 关爱级别对话框 -->
    <v-dialog v-model="levelDialog" max-width="500">
      <v-card>
        <v-card-title>新增关爱级别</v-card-title>
        <v-card-text>
          <v-text-field v-model="levelForm.level_name" label="级别名称" />
          <v-select v-model="levelForm.period_type" :items="[{text:'月',value:'month'},{text:'学期',value:'semester'}]" item-title="text" item-value="value" label="关爱周期" />
          <v-text-field v-model="levelForm.period_count" type="number" label="周期次数" />
          <v-textarea v-model="levelForm.description" label="描述" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="levelDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveLevel">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 年级对话框 -->
    <v-dialog v-model="gradeDialog" max-width="500">
      <v-card>
        <v-card-title>新增年级</v-card-title>
        <v-card-text>
          <v-text-field v-model="gradeForm.grade_name" label="年级名称" />
          <v-text-field v-model="gradeForm.director_name" label="年级主任" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="gradeDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveGrade">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 班级对话框 -->
    <v-dialog v-model="classDialog" max-width="500">
      <v-card>
        <v-card-title>新增班级</v-card-title>
        <v-card-text>
          <v-select v-model="classForm.grade_id" :items="grades" item-title="grade_name" item-value="id" label="年级" />
          <v-text-field v-model="classForm.class_name" label="班级名称" />
          <v-text-field v-model="classForm.teacher_name" label="班主任" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="classDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveClass">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 心理教师对话框 -->
    <v-dialog v-model="psyTeacherDialog" max-width="500">
      <v-card>
        <v-card-title>添加心理教师</v-card-title>
        <v-card-text>
          <v-text-field v-model="psyTeacherForm.teacher_name" label="教师姓名" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="psyTeacherDialog = false">取消</v-btn>
          <v-btn color="primary" @click="savePsyTeacher">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const careLevels = ref([])
const grades = ref([])
const classes = ref([])
const psyTeachers = ref([])

const gradeMap = computed(() => {
  const map = {}
  grades.value.forEach(g => { map[g.id] = g })
  return map
})

// Care Level
const levelDialog = ref(false)
const levelForm = ref({ level_name: '', period_type: 'month', period_count: 1, description: '' })
function openLevelDialog() { levelForm.value = { level_name: '', period_type: 'month', period_count: 1, description: '' }; levelDialog.value = true }
async function saveLevel() { await api.createCareLevel(levelForm.value); levelDialog.value = false; careLevels.value = await api.getCareLevels() }
async function deleteLevel(id) { if (confirm('确定删除？')) { await api.deleteCareLevel(id); careLevels.value = await api.getCareLevels() } }

// Grade
const gradeDialog = ref(false)
const gradeForm = ref({ grade_name: '', director_name: '' })
function openGradeDialog() { gradeForm.value = { grade_name: '', director_name: '' }; gradeDialog.value = true }
async function saveGrade() { await api.createGrade(gradeForm.value); gradeDialog.value = false; grades.value = await api.getGrades() }
async function deleteGrade(id) { if (confirm('确定删除？')) { await api.deleteGrade(id); grades.value = await api.getGrades() } }

// Class
const classDialog = ref(false)
const classForm = ref({ grade_id: null, class_name: '', teacher_name: '' })
function openClassDialog() { classForm.value = { grade_id: null, class_name: '', teacher_name: '' }; classDialog.value = true }
async function saveClass() { await api.createClass(classForm.value); classDialog.value = false; classes.value = await api.getClasses() }
async function deleteClass(id) { if (confirm('确定删除？')) { await api.deleteClass(id); classes.value = await api.getClasses() } }

// Psychological Teacher
const psyTeacherDialog = ref(false)
const psyTeacherForm = ref({ teacher_name: '' })
function openPsyTeacherDialog() { psyTeacherForm.value = { teacher_name: '' }; psyTeacherDialog.value = true }
async function savePsyTeacher() { await api.addPsychologicalTeacher(psyTeacherForm.value); psyTeacherDialog.value = false; psyTeachers.value = await api.getPsychologicalTeachers() }
async function deletePsyTeacher(id) { if (confirm('确定删除？')) { await api.removePsychologicalTeacher(id); psyTeachers.value = await api.getPsychologicalTeachers() } }

onMounted(async () => {
  careLevels.value = await api.getCareLevels()
  grades.value = await api.getGrades()
  classes.value = await api.getClasses()
  psyTeachers.value = await api.getPsychologicalTeachers()
})
</script>
