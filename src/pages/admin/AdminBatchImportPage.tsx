import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAPI, enhancedAiAPI, problemsAPI } from '../../services/api';
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  X,
  Plus,
  FileUp,
  ClipboardPaste,
  FolderTree,
} from 'lucide-react';

interface ParsedProblem {
  title: string;
  type: string;
  difficulty: string;
  description: string;
  testCases?: { input: string; output: string; isSample: boolean }[];
  choices?: { key: string; text: string }[];
  correctAnswer?: string;
  fillBlanks?: string[];
  tags?: string[];
  sourceFile?: string;
  timeLimit?: number;
  memoryLimit?: number;
}

interface ImportResult {
  total: number;
  succeeded: number;
  failed: number;
  results?: { index: number; success: boolean; message?: string; title?: string }[];
}

const TYPE_MAP: Record<string, string> = {
  PROGRAMMING: '编程题',
  CHOICE: '选择题',
  FILL_BLANK: '填空题',
};

const DIFFICULTY_MAP: Record<string, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-green-400 bg-green-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/20',
  HARD: 'text-red-400 bg-red-500/20',
};

const TYPE_COLORS: Record<string, string> = {
  PROGRAMMING: 'text-cyan-400 bg-cyan-500/20',
  CHOICE: 'text-purple-400 bg-purple-500/20',
  FILL_BLANK: 'text-orange-400 bg-orange-500/20',
};

export function AdminBatchImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [importMode, setImportMode] = useState<'ai' | 'file' | 'folder'>('ai');
  const [problemFiles, setProblemFiles] = useState<File[]>([]);
  const [testDataFiles, setTestDataFiles] = useState<File[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [problems, setProblems] = useState<ParsedProblem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedProblem | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // 默认拖放处理 - 如果没有明确的目标区域，默认放到题目文件
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => importMode === 'ai'
        ? (f.name.endsWith('.txt') || f.name.endsWith('.json'))
        : (f.name.endsWith('.json') || f.name.endsWith('.in') || f.name.endsWith('.out'))
    );
    if (droppedFiles.length > 0) {
      setProblemFiles((prev) => [...prev, ...droppedFiles.filter(f => f.name.endsWith('.json') || f.name.endsWith('.txt'))]);
      setTestDataFiles((prev) => [...prev, ...droppedFiles.filter(f => f.name.endsWith('.in') || f.name.endsWith('.out'))]);
    }
  }, [importMode]);

  const handleProblemFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => importMode === 'ai'
        ? (f.name.endsWith('.txt') || f.name.endsWith('.json'))
        : f.name.endsWith('.json')
    );
    if (selected.length > 0) {
      setProblemFiles((prev) => [...prev, ...selected]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTestDataFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => f.name.endsWith('.in') || f.name.endsWith('.out')
    );
    if (selected.length > 0) {
      setTestDataFiles((prev) => [...prev, ...selected]);
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const removeProblemFile = (index: number) => {
    setProblemFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeTestDataFile = (index: number) => {
    setTestDataFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    // 兼容旧代码，暂时保留
  };

  const handleFolderModeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      // 分开 JSON 文件和测试数据文件
      const jsonFiles = selected.filter(f => f.name.endsWith('.json'));
      const dataFiles = selected.filter(f => f.name.endsWith('.in') || f.name.endsWith('.out'));
      
      setProblemFiles(prev => [...prev, ...jsonFiles]);
      setTestDataFiles(prev => [...prev, ...dataFiles]);
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleParse = async () => {
    if (problemFiles.length === 0 && testDataFiles.length === 0 && !pasteText.trim()) return;

    setParsing(true);
    setImportResult(null);

    try {
      if (importMode === 'ai') {
        await handleAiParse();
      } else if (importMode === 'folder') {
        await handleFolderParse();
      } else {
        await handleFileParse();
      }
    } catch (error: any) {
      alert(error.error?.message || '解析失败，请检查文件格式或网络连接');
    } finally {
      setParsing(false);
    }
  };

  const handleFolderParse = async () => {
    const allParsed: ParsedProblem[] = [];
    const fileContentMap: Record<string, string> = {};

    const allFiles = [...problemFiles, ...testDataFiles];
    for (const file of allFiles) {
      const key = file.webkitRelativePath || file.name;
      fileContentMap[key] = await file.text();
      fileContentMap[file.name] = fileContentMap[key];
    }

    /**
     * 建立测试数据索引，支持多种文件夹结构：
     * 结构1: problem1/1.in, problem1/1.out （数据与题目同名文件夹）
     * 结构2: problem1/data/1.in （数据在子文件夹中）
     * 结构3: 1.in, 1.out （数据在根目录）
     */
    const dataFoldersByName = new Map<string, { inFiles: File[]; outFiles: File[] }>();
    const dataByDirectory = new Map<string, { inFiles: File[]; outFiles: File[] }>();

    for (const file of testDataFiles) {
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');

      if (parts.length >= 2) {
        const immediateParent = parts[parts.length - 2];
        if (!dataFoldersByName.has(immediateParent)) {
          dataFoldersByName.set(immediateParent, { inFiles: [], outFiles: [] });
        }
        if (file.name.endsWith('.in')) {
          dataFoldersByName.get(immediateParent)!.inFiles.push(file);
        } else if (file.name.endsWith('.out')) {
          dataFoldersByName.get(immediateParent)!.outFiles.push(file);
        }
      }

      const dirKey = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '__root__';
      if (!dataByDirectory.has(dirKey)) {
        dataByDirectory.set(dirKey, { inFiles: [], outFiles: [] });
      }
      if (file.name.endsWith('.in')) {
        dataByDirectory.get(dirKey)!.inFiles.push(file);
      } else if (file.name.endsWith('.out')) {
        dataByDirectory.get(dirKey)!.outFiles.push(file);
      }
    }

    const readTestCasesFromFiles = (
      inFiles: File[],
      outFiles: File[]
    ): { input: string; output: string; isSample: boolean }[] => {
      const sortedIn = [...inFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const sortedOut = [...outFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const maxLen = Math.max(sortedIn.length, sortedOut.length);
      const cases: { input: string; output: string; isSample: boolean }[] = [];
      for (let i = 0; i < maxLen; i++) {
        const input = sortedIn[i] ? fileContentMap[sortedIn[i].webkitRelativePath || sortedIn[i].name] || '' : '';
        const output = sortedOut[i] ? fileContentMap[sortedOut[i].webkitRelativePath || sortedOut[i].name] || '' : '';
        cases.push({ input, output, isSample: i === 0 });
      }
      return cases;
    };

    const usedDataDirs = new Set<string>();
    const consumedDataDirs = new Set<string>();

    for (const jsonFile of problemFiles) {
      try {
        const jsonPath = jsonFile.webkitRelativePath || jsonFile.name;
        const content = fileContentMap[jsonPath];
        if (!content) continue;

        const data = JSON.parse(content);
        const jsonNameWithoutExt = jsonFile.name.replace(/\.json$/i, '');
        const jsonDir = jsonPath.includes('/') ? jsonPath.substring(0, jsonPath.lastIndexOf('/')) : '';

        let extraTestCases: { input: string; output: string; isSample: boolean }[] = [];
        let matchedDirKey = '';

        // 策略1：JSON文件名（去扩展名）与数据文件夹名精确匹配
        const matchedByName = dataFoldersByName.get(jsonNameWithoutExt);
        if (matchedByName && (matchedByName.inFiles.length > 0 || matchedByName.outFiles.length > 0)) {
          extraTestCases = readTestCasesFromFiles(matchedByName.inFiles, matchedByName.outFiles);
          const matchedDir = matchedByName.inFiles[0]?.webkitRelativePath || matchedByName.outFiles[0]?.webkitRelativePath || '';
          if (matchedDir.includes('/')) {
            matchedDirKey = matchedDir.substring(0, matchedDir.lastIndexOf('/'));
          }
          dataFoldersByName.delete(jsonNameWithoutExt);
        }

        // 策略2：JSON所在目录下有同目录的 .in/.out 文件
        if (extraTestCases.length === 0 && jsonDir && dataByDirectory.has(jsonDir) && !consumedDataDirs.has(jsonDir)) {
          const dirData = dataByDirectory.get(jsonDir)!;
          if (dirData.inFiles.length > 0 || dirData.outFiles.length > 0) {
            extraTestCases = readTestCasesFromFiles(dirData.inFiles, dirData.outFiles);
            matchedDirKey = jsonDir;
          }
        }

        // 策略3：JSON所在目录的子文件夹中有数据（如 data/ 子文件夹）
        if (extraTestCases.length === 0 && jsonDir) {
          for (const [dirKey, dirData] of dataByDirectory) {
            if (consumedDataDirs.has(dirKey)) continue;
            if (dirKey.startsWith(jsonDir + '/') && (dirData.inFiles.length > 0 || dirData.outFiles.length > 0)) {
              extraTestCases = readTestCasesFromFiles(dirData.inFiles, dirData.outFiles);
              matchedDirKey = dirKey;
              break;
            }
          }
        }

        // 策略4：JSON父目录名与数据文件夹名匹配
        if (extraTestCases.length === 0 && jsonDir) {
          const parentDirName = jsonDir.split('/').pop() || '';
          const matchedByParent = dataFoldersByName.get(parentDirName);
          if (matchedByParent && (matchedByParent.inFiles.length > 0 || matchedByParent.outFiles.length > 0)) {
            extraTestCases = readTestCasesFromFiles(matchedByParent.inFiles, matchedByParent.outFiles);
            const matchedDir = matchedByParent.inFiles[0]?.webkitRelativePath || matchedByParent.outFiles[0]?.webkitRelativePath || '';
            if (matchedDir.includes('/')) {
              matchedDirKey = matchedDir.substring(0, matchedDir.lastIndexOf('/'));
            }
            dataFoldersByName.delete(parentDirName);
          }
        }

        if (matchedDirKey) {
          consumedDataDirs.add(matchedDirKey);
          usedDataDirs.add(matchedDirKey);
        }

        // 解析 JSON 内容，支持单题、数组、{ problems: [...] } 三种格式
        const parseAndPush = (item: any) => {
          const parsed = parseJsonProblem(item, jsonFile.name, fileContentMap, jsonDir || undefined);
          if (extraTestCases.length > 0) {
            parsed.testCases = [...(parsed.testCases || []), ...extraTestCases];
          }
          allParsed.push(parsed);
        };

        if (Array.isArray(data)) {
          data.forEach(parseAndPush);
        } else if (data.problems && Array.isArray(data.problems)) {
          data.problems.forEach(parseAndPush);
        } else {
          parseAndPush(data);
        }
      } catch (e) {
        console.error(`Error parsing file ${jsonFile.name}:`, e);
      }
    }

    // 处理没有匹配到 JSON 的数据文件夹
    const usedFolderNames = new Set<string>();
    for (const jsonFile of problemFiles) {
      usedFolderNames.add(jsonFile.name.replace(/\.json$/i, ''));
    }

    for (const [dirKey, dirData] of dataByDirectory) {
      if (usedDataDirs.has(dirKey)) continue;
      if (dirData.inFiles.length === 0 && dirData.outFiles.length === 0) continue;

      const dirName = dirKey === '__root__' ? '' : dirKey.split('/').pop() || dirKey;
      if (usedFolderNames.has(dirName)) continue;

      const testCases = readTestCasesFromFiles(dirData.inFiles, dirData.outFiles);
      allParsed.push({
        title: dirName || '未命名题目',
        type: 'PROGRAMMING',
        difficulty: 'MEDIUM',
        description: `题目来源: ${dirName}`,
        testCases,
        sourceFile: dirName,
      });
    }

    setProblems(allParsed);
  };

  const handleAiParse = async () => {
    const allParsed: ParsedProblem[] = [];
    const allFiles = [...problemFiles, ...testDataFiles];

    if (allFiles.length > 0) {
      const formData = new FormData();
      allFiles.forEach((file) => {
        formData.append('files', file);
      });

      const uploadRes = await uploadAPI.uploadFiles(formData);
      if (uploadRes.success && uploadRes.data) {
        const uploadedFiles = Array.isArray(uploadRes.data) ? uploadRes.data : [uploadRes.data];
        for (const uploaded of uploadedFiles) {
          const parseRes = await enhancedAiAPI.parseProblemFile(
            uploaded.content,
            uploaded.fileType
          );
          if (parseRes.success && parseRes.data?.problems) {
            allParsed.push(...parseRes.data.problems);
          }
        }
      }
    }

    if (pasteText.trim()) {
      const parseRes = await enhancedAiAPI.parseProblemFile(pasteText.trim(), 'txt');
      if (parseRes.success && parseRes.data?.problems) {
        allParsed.push(...parseRes.data.problems);
      }
    }

    setProblems(allParsed);
  };

  const parseJsonProblem = (data: any, fileName: string, fileContentMap: Record<string, string>, jsonDir?: string): ParsedProblem => {
    const prob = data.problem || data;
    const type = prob.type === 1 || prob.type === 'PROGRAMMING' ? 'PROGRAMMING'
      : prob.type === 2 || prob.type === 'CHOICE' ? 'CHOICE'
      : 'PROGRAMMING';
    const difficulty = prob.difficulty === 1 || prob.difficulty === 'EASY' ? 'EASY'
      : prob.difficulty === 2 || prob.difficulty === 'MEDIUM' ? 'MEDIUM'
      : prob.difficulty === 3 || prob.difficulty === 'HARD' ? 'HARD'
      : 'MEDIUM';

    const testCases: { input: string; output: string; isSample: boolean }[] = [];

    /**
     * 解析 JSON 中引用的文件路径，仅匹配与当前 JSON 同目录下的数据文件，
     * 避免跨目录匹配导致数据串题。
     */
    const resolveFileRef = (ref: string): string => {
      if (!ref) return '';
      if (ref.endsWith('.in') || ref.endsWith('.out') || ref.endsWith('.txt')) {
        if (jsonDir) {
          const fullPath = jsonDir + '/' + ref;
          if (fileContentMap[fullPath] !== undefined) return fileContentMap[fullPath];
        }
        if (fileContentMap[ref] !== undefined) return fileContentMap[ref];
      }
      return ref;
    };

    if (data.samples && Array.isArray(data.samples)) {
      for (const sample of data.samples) {
        const inputVal = resolveFileRef(sample.input || '');
        const outputVal = resolveFileRef(sample.output || '');
        testCases.push({
          input: inputVal,
          output: outputVal,
          isSample: true
        });
      }
    }
    if (prob.examples && Array.isArray(prob.examples)) {
      for (const ex of prob.examples) {
        const inputVal = resolveFileRef(ex.input || '');
        const outputVal = resolveFileRef(ex.output || '');
        testCases.push({
          input: inputVal,
          output: outputVal,
          isSample: true
        });
      }
    }

    const tags: string[] = [];
    if (data.tags && Array.isArray(data.tags)) {
      tags.push(...data.tags);
    }
    if (prob.tags && Array.isArray(prob.tags)) {
      tags.push(...prob.tags);
    }
    if (prob.source) {
      tags.push(prob.source);
    }

    let description = prob.description || '';
    if (prob.input) {
      description += `\n\n**输入格式**\n${prob.input}`;
    }
    if (prob.output) {
      description += `\n\n**输出格式**\n${prob.output}`;
    }
    if (prob.hint) {
      description += `\n\n**提示**\n${prob.hint}`;
    }

    const choices: { key: string; text: string }[] = [];
    if (prob.options && Array.isArray(prob.options)) {
      for (let i = 0; i < prob.options.length; i++) {
        choices.push({ key: String.fromCharCode(65 + i), text: prob.options[i] });
      }
    }

    return {
      title: prob.title || fileName.replace(/\.\w+$/, ''),
      type,
      difficulty,
      description,
      testCases: testCases.length > 0 ? testCases : undefined,
      choices: choices.length > 0 ? choices : undefined,
      correctAnswer: prob.correctAnswer || prob.answer || undefined,
      fillBlanks: prob.fillBlanks ? (Array.isArray(prob.fillBlanks) ? prob.fillBlanks : undefined) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceFile: fileName,
      timeLimit: prob.timeLimit || undefined,
      memoryLimit: prob.memoryLimit || undefined,
    };
  };

  const handleFileParse = async () => {
    if (problemFiles.length === 0 && testDataFiles.length === 0) return;
    setParsing(true);
    setImportResult(null);

    try {
      const allParsed: ParsedProblem[] = [];
      const fileContentMap: Record<string, string> = {};
      const jsonFiles: { file: File; relPath: string }[] = [];
      const dataFileMap: Record<string, { inFiles: File[]; outFiles: File[] }> = {};

      // 收集题目JSON文件
      for (const file of problemFiles) {
        if (file.name.endsWith('.json')) {
          jsonFiles.push({ file, relPath: file.webkitRelativePath || file.name });
        }
      }

      // 收集测试数据文件并建立文件夹索引
      for (const file of testDataFiles) {
        const name = file.name;
        const relPath = file.webkitRelativePath || name;

        if (name.endsWith('.in')) {
          const dirKey = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '__root__';
          if (!dataFileMap[dirKey]) dataFileMap[dirKey] = { inFiles: [], outFiles: [] };
          dataFileMap[dirKey].inFiles.push(file);
        } else if (name.endsWith('.out')) {
          const dirKey = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '__root__';
          if (!dataFileMap[dirKey]) dataFileMap[dirKey] = { inFiles: [], outFiles: [] };
          dataFileMap[dirKey].outFiles.push(file);
        }
      }

      for (const [, dirData] of Object.entries(dataFileMap)) {
        for (const f of dirData.inFiles) {
          const key = f.webkitRelativePath || f.name;
          fileContentMap[key] = await f.text();
          fileContentMap[f.name] = fileContentMap[key];
        }
        for (const f of dirData.outFiles) {
          const key = f.webkitRelativePath || f.name;
          fileContentMap[key] = await f.text();
          fileContentMap[f.name] = fileContentMap[key];
        }
      }

      for (const { file, relPath } of jsonFiles) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          const jsonDir = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '';

          if (jsonDir && dataFileMap[jsonDir]) {
            const dirData = dataFileMap[jsonDir];
            const extraTestCases: { input: string; output: string; isSample: boolean }[] = [];
            const inFiles = dirData.inFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            const outFiles = dirData.outFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            const maxLen = Math.max(inFiles.length, outFiles.length);
            for (let i = 0; i < maxLen; i++) {
              extraTestCases.push({
                input: i < inFiles.length ? await inFiles[i].text() : '',
                output: i < outFiles.length ? await outFiles[i].text() : '',
                isSample: i === 0
              });
            }

            const parsed = parseJsonProblem(data, file.name, fileContentMap, jsonDir || undefined);
            if (extraTestCases.length > 0) {
              parsed.testCases = [...(parsed.testCases || []), ...extraTestCases];
            }
            allParsed.push(parsed);
            delete dataFileMap[jsonDir];
          } else {
            const jsonBaseName = file.name.replace(/\.\w+$/, '');
            let matchedDir = '';
            for (const dirKey of Object.keys(dataFileMap)) {
              const dirName = dirKey.split('/').pop() || dirKey;
              if (dirName === jsonBaseName || dirName.includes(jsonBaseName) || jsonBaseName.includes(dirName)) {
                matchedDir = dirKey;
                break;
              }
            }

            if (matchedDir) {
              const dirData = dataFileMap[matchedDir];
              const extraTestCases: { input: string; output: string; isSample: boolean }[] = [];
              const inFiles = [...dirData.inFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
              const outFiles = [...dirData.outFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
              const maxLen = Math.max(inFiles.length, outFiles.length);
              for (let i = 0; i < maxLen; i++) {
                extraTestCases.push({
                  input: i < inFiles.length ? await inFiles[i].text() : '',
                  output: i < outFiles.length ? await outFiles[i].text() : '',
                  isSample: i === 0
                });
              }
              const parsed = parseJsonProblem(data, file.name, fileContentMap, matchedDir || undefined);
              if (extraTestCases.length > 0) {
                parsed.testCases = [...(parsed.testCases || []), ...extraTestCases];
              }
              allParsed.push(parsed);
              delete dataFileMap[matchedDir];
            } else {
              if (Array.isArray(data)) {
                for (const item of data) {
                  allParsed.push(parseJsonProblem(item, file.name, fileContentMap, jsonDir || undefined));
                }
              } else if (data.problems && Array.isArray(data.problems)) {
                for (const item of data.problems) {
                  allParsed.push(parseJsonProblem(item, file.name, fileContentMap, jsonDir || undefined));
                }
              } else {
                allParsed.push(parseJsonProblem(data, file.name, fileContentMap, jsonDir || undefined));
              }
            }
          }
        } catch {
          alert(`文件 ${file.name} JSON 解析失败，请检查格式`);
        }
      }

      for (const [dirKey, dirData] of Object.entries(dataFileMap)) {
        if (dirData.inFiles.length === 0 && dirData.outFiles.length === 0) continue;

        const testCases: { input: string; output: string; isSample: boolean }[] = [];
        const inFiles = dirData.inFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        const outFiles = dirData.outFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        const maxLen = Math.max(inFiles.length, outFiles.length);
        for (let i = 0; i < maxLen; i++) {
          testCases.push({
            input: i < inFiles.length ? await inFiles[i].text() : '',
            output: i < outFiles.length ? await outFiles[i].text() : '',
            isSample: i === 0
          });
        }

        const folderName = dirKey === '__root__' ? '未命名题目' : dirKey.split('/').pop() || dirKey;
        allParsed.push({
          title: folderName,
          type: 'PROGRAMMING',
          difficulty: 'MEDIUM',
          description: `题目来源: ${folderName}`,
          testCases,
          sourceFile: folderName,
        });
      }

      if (allParsed.length === 0) {
        alert('未找到可导入的题目文件。请确保上传了 .json 题目文件或包含 .in/.out 文件的文件夹。');
      }

      setProblems(allParsed);
    } catch (error: any) {
      alert('文件解析失败: ' + (error.message || '未知错误'));
    } finally {
      setParsing(false);
    }
  };

  const MAX_BATCH_BYTES = 4 * 1024 * 1024;
  const MAX_SINGLE_PROBLEM_BYTES = 8 * 1024 * 1024;

  const handleBatchImport = async () => {
    if (problems.length === 0) return;

    setImporting(true);
    setImportResult(null);
    setBatchProgress(0);

    const safeProblems = problems.map(p => {
      const safeP: any = {
        title: String(p.title || ''),
        description: String(p.description || ''),
        type: String(p.type || 'PROGRAMMING'),
        difficulty: String(p.difficulty || 'MEDIUM'),
        tags: Array.isArray(p.tags) ? p.tags : [],
        timeLimit: Number(p.timeLimit) || 2000,
        memoryLimit: Number(p.memoryLimit) || 256,
      };

      if (p.testCases && Array.isArray(p.testCases) && p.testCases.length > 0) {
        safeP.testCases = p.testCases.map((tc: any) => ({
          input: String(tc.input ?? ''),
          output: String(tc.output ?? ''),
          isSample: tc.isSample !== undefined ? Boolean(tc.isSample) : true,
        }));
      } else {
        safeP.testCases = [{ input: '', output: '', isSample: true }];
      }

      if (p.choices && Array.isArray(p.choices) && p.choices.length > 0) {
        safeP.choices = p.choices.map((c: any) => ({
          key: String(c.key || ''),
          text: String(c.text || ''),
        }));
      }

      if (p.correctAnswer != null && p.correctAnswer !== '') {
        safeP.correctAnswer = String(p.correctAnswer);
      }

      if (p.fillBlanks && Array.isArray(p.fillBlanks) && p.fillBlanks.length > 0) {
        safeP.fillBlanks = p.fillBlanks.map((fb: any) => String(fb));
      }

      if (p.sourceFile) {
        safeP.sourceFile = String(p.sourceFile);
      }

      /**
       * 单题体积超限时，从后向前裁剪测试数据，
       * 保留样例测试点，截断非样例的大数据点。
       */
      let serializedSize = new Blob([JSON.stringify(safeP)]).size;
      if (serializedSize > MAX_SINGLE_PROBLEM_BYTES && safeP.testCases.length > 1) {
        const sampleCases = safeP.testCases.filter((tc: any) => tc.isSample);
        const nonSampleCases = safeP.testCases.filter((tc: any) => !tc.isSample);

        while (nonSampleCases.length > 0 && serializedSize > MAX_SINGLE_PROBLEM_BYTES) {
          const largest = nonSampleCases.reduce((max: any, tc: any) =>
            (tc.input.length + tc.output.length) > (max.input.length + max.output.length) ? tc : max
          , nonSampleCases[0]);
          const idx = nonSampleCases.indexOf(largest);
          nonSampleCases.splice(idx, 1);
          safeP.testCases = [...sampleCases, ...nonSampleCases];
          serializedSize = new Blob([JSON.stringify(safeP)]).size;
        }
      }

      return safeP;
    });

    /**
     * 按体积智能分批：估算每道题的 JSON 序列化大小，
     * 当累计体积超过 MAX_BATCH_BYTES 时开启新批次，
     * 确保单批请求不会超过服务端 body 限制。
     */
    const batches: any[][] = [];
    let currentBatch: any[] = [];
    let currentSize = 0;

    for (const problem of safeProblems) {
      const problemSize = new Blob([JSON.stringify(problem)]).size;

      if (currentBatch.length > 0 && currentSize + problemSize > MAX_BATCH_BYTES) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }

      currentBatch.push(problem);
      currentSize += problemSize;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    setBatchTotal(batches.length);

    let totalSucceeded = 0;
    let totalFailed = 0;
    const allResults: { index: number; success: boolean; message: string; title: string }[] = [];
    let globalIndex = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      setBatchProgress(batchIdx + 1);

      try {
        const res = await problemsAPI.batchImport(batches[batchIdx]);
        if (res.success && res.data) {
          const data = res.data;
          totalSucceeded += data.succeeded || 0;
          totalFailed += data.failed || 0;

          for (const r of data.results || []) {
            allResults.push({
              index: globalIndex++,
              success: r.success,
              message: r.error || r.message || '',
              title: r.title || '',
            });
          }
        }
      } catch (error: any) {
        const batchProblems = batches[batchIdx];
        if (batchProblems.length === 1) {
          allResults.push({
            index: globalIndex++,
            success: false,
            message: error.error?.message || '请求失败（数据可能过大）',
            title: batchProblems[0].title || '',
          });
          totalFailed++;
        } else {
          for (const bp of batchProblems) {
            try {
              const singleRes = await problemsAPI.batchImport([bp]);
              if (singleRes.success && singleRes.data) {
                totalSucceeded += singleRes.data.succeeded || 0;
                totalFailed += singleRes.data.failed || 0;
                for (const r of singleRes.data.results || []) {
                  allResults.push({
                    index: globalIndex++,
                    success: r.success,
                    message: r.error || r.message || '',
                    title: r.title || '',
                  });
                }
              }
            } catch {
              allResults.push({
                index: globalIndex++,
                success: false,
                message: '请求失败（数据可能过大）',
                title: bp.title || '',
              });
              totalFailed++;
            }
          }
        }
      }
    }

    setImportResult({
      total: safeProblems.length,
      succeeded: totalSucceeded,
      failed: totalFailed,
      results: allResults,
    });
    setImporting(false);
  };

  const removeProblem = (index: number) => {
    setProblems((prev) => prev.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...problems[index] });
  };

  const saveEdit = () => {
    if (editingIndex !== null && editForm) {
      setProblems((prev) =>
        prev.map((p, i) => (i === editingIndex ? editForm : p))
      );
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const updateEditField = (field: keyof ParsedProblem, value: any) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  const updateEditChoice = (choiceIndex: number, text: string) => {
    if (!editForm?.choices) return;
    const newChoices = [...editForm.choices];
    newChoices[choiceIndex] = { ...newChoices[choiceIndex], text };
    setEditForm({ ...editForm, choices: newChoices });
  };

  const addEditChoice = () => {
    if (!editForm) return;
    const choices = editForm.choices || [];
    const nextKey = String.fromCharCode(65 + choices.length);
    setEditForm({
      ...editForm,
      choices: [...choices, { key: nextKey, text: '' }],
    });
  };

  const removeEditChoice = (choiceIndex: number) => {
    if (!editForm?.choices || editForm.choices.length <= 2) return;
    const newChoices = editForm.choices.filter((_, i) => i !== choiceIndex);
    newChoices.forEach((c, i) => {
      c.key = String.fromCharCode(65 + i);
    });
    setEditForm({ ...editForm, choices: newChoices });
  };

  const updateEditTestCase = (
    tcIndex: number,
    field: 'input' | 'output' | 'isSample',
    value: string | boolean
  ) => {
    if (!editForm?.testCases) return;
    const newTestCases = [...editForm.testCases];
    newTestCases[tcIndex] = { ...newTestCases[tcIndex], [field]: value };
    setEditForm({ ...editForm, testCases: newTestCases });
  };

  const addEditTestCase = () => {
    if (!editForm) return;
    const testCases = editForm.testCases || [];
    setEditForm({
      ...editForm,
      testCases: [...testCases, { input: '', output: '', isSample: false }],
    });
  };

  const removeEditTestCase = (tcIndex: number) => {
    if (!editForm?.testCases || editForm.testCases.length <= 1) return;
    setEditForm({
      ...editForm,
      testCases: editForm.testCases.filter((_, i) => i !== tcIndex),
    });
  };

  const updateEditFillBlank = (fbIndex: number, value: string) => {
    if (!editForm?.fillBlanks) return;
    const newFillBlanks = [...editForm.fillBlanks];
    newFillBlanks[fbIndex] = value;
    setEditForm({ ...editForm, fillBlanks: newFillBlanks });
  };

  const addEditFillBlank = () => {
    if (!editForm) return;
    const fillBlanks = editForm.fillBlanks || [];
    setEditForm({ ...editForm, fillBlanks: [...fillBlanks, ''] });
  };

  const removeEditFillBlank = (fbIndex: number) => {
    if (!editForm?.fillBlanks || editForm.fillBlanks.length <= 1) return;
    setEditForm({
      ...editForm,
      fillBlanks: editForm.fillBlanks.filter((_, i) => i !== fbIndex),
    });
  };

  const resetAll = () => {
    setProblemFiles([]);
    setTestDataFiles([]);
    setPasteText('');
    setProblems([]);
    setImportResult(null);
    setEditingIndex(null);
    setEditForm(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/admin/problems')}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回题目管理
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">批量导入题目</h1>
          <p className="text-slate-400 mt-2">
            {importMode === 'ai'
              ? '上传 TXT/JSON 文件或直接粘贴文本，AI 自动解析为结构化题目后一键导入'
              : importMode === 'folder'
              ? '选择包含多个题目的文件夹，自动识别题目和测试数据'
              : '上传 JSON 题目文件或包含 .in/.out 测试数据点的文件夹，直接解析导入'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setImportMode('ai')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMode === 'ai' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              AI解析导入
            </button>
            <button
              onClick={() => setImportMode('file')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMode === 'file' ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              文件直接导入
            </button>
            <button
              onClick={() => setImportMode('folder')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMode === 'folder' ? 'bg-purple-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              整文件夹导入
            </button>
          </div>
          {problems.length > 0 && (
            <button
              onClick={resetAll}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              重新开始
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {problems.length === 0 && (
          <>
            {importMode === 'file' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 题目文件区域 */}
                <div className="bg-slate-800 rounded-xl p-6 shadow-xl border-2 border-dashed border-cyan-500/50">
                  <div className="flex items-center mb-4">
                    <FileText className="h-6 w-6 text-cyan-400 mr-2" />
                    <h3 className="text-lg font-semibold text-white">题目文件</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    选择 .json 格式的题目文件，可多选
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors mb-4"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    选择题目文件
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    multiple
                    onChange={handleProblemFileSelect}
                    className="hidden"
                  />
                  {problemFiles.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">已选择 {problemFiles.length} 个文件</span>
                        <button
                          onClick={() => setProblemFiles([])}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          清空
                        </button>
                      </div>
                      {problemFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                          <div className="flex items-center min-w-0">
                            <FileText className="h-4 w-4 text-cyan-400 mr-2 shrink-0" />
                            <span className="text-white text-sm truncate">{file.name}</span>
                          </div>
                          <button
                            onClick={() => removeProblemFile(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 测试数据区域 */}
                <div className="bg-slate-800 rounded-xl p-6 shadow-xl border-2 border-dashed border-purple-500/50">
                  <div className="flex items-center mb-4">
                    <FolderTree className="h-6 w-6 text-purple-400 mr-2" />
                    <h3 className="text-lg font-semibold text-white">测试数据</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    选择包含 .in/.out 文件的文件夹，可多次点击添加不同文件夹
                  </p>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="w-full flex items-center justify-center px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors mb-4"
                  >
                    <FolderTree className="h-5 w-5 mr-2" />
                    选择测试数据文件夹
                  </button>
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    onChange={handleTestDataFolderSelect}
                    className="hidden"
                    {...({ webkitdirectory: '', directory: '' } as any)}
                  />
                  {testDataFiles.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">已选择 {testDataFiles.length} 个文件</span>
                        <button
                          onClick={() => setTestDataFiles([])}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          清空
                        </button>
                      </div>
                      {testDataFiles.slice(0, 20).map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                          <div className="flex items-center min-w-0">
                            <FileText className="h-4 w-4 text-purple-400 mr-2 shrink-0" />
                            <span className="text-white text-sm truncate">
                              {file.webkitRelativePath || file.name}
                            </span>
                          </div>
                          <button
                            onClick={() => removeTestDataFile(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {testDataFiles.length > 20 && (
                        <div className="text-slate-400 text-sm text-center py-2">
                          还有 {testDataFiles.length - 20} 个文件未显示
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : importMode === 'folder' ? (
              <div
                className={`bg-slate-800 rounded-xl p-8 shadow-xl border-2 border-dashed transition-colors ${
                  dragOver
                    ? 'border-purple-500 bg-purple-500/5'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                    <FolderTree className="h-8 w-8 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    选择包含多题目的文件夹
                  </h3>
                  <p className="text-slate-400 mb-4">
                    文件夹下应该有多个子文件夹，每个子文件夹包含一道题目的 .json 文件和 .in/.out 测试数据。可多次点击添加不同文件夹
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="flex items-center px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      选择整文件夹
                    </button>
                  </div>
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    onChange={handleFolderModeSelect}
                    className="hidden"
                    {...({ webkitdirectory: '', directory: '' } as any)}
                  />
                </div>
              </div>
            ) : (
              <div
                className={`bg-slate-800 rounded-xl p-8 shadow-xl border-2 border-dashed transition-colors ${
                  dragOver
                    ? 'border-cyan-500 bg-cyan-500/5'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                    <FileUp className="h-8 w-8 text-cyan-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    拖拽文件到此处上传
                  </h3>
                  <p className="text-slate-400 mb-4">
                    支持 .txt 和 .json 格式，可同时上传多个文件
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      选择文件
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.json"
                    multiple
                    onChange={handleProblemFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {(importMode === 'folder' || importMode === 'file') && (problemFiles.length > 0 || testDataFiles.length > 0) && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    已选择的文件 ({problemFiles.length + testDataFiles.length})
                  </h3>
                  <button
                    onClick={() => { setProblemFiles([]); setTestDataFiles([]); }}
                    className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                  >
                    清空全部
                  </button>
                </div>
                <div className="space-y-4">
                  {problemFiles.length > 0 && (
                    <div>
                      <h4 className="text-slate-300 text-sm mb-2">题目文件 ({problemFiles.length})</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {problemFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                            <div className="flex items-center min-w-0">
                              <FileText className="h-4 w-4 text-cyan-400 mr-2 shrink-0" />
                              <span className="text-white text-sm truncate">{file.webkitRelativePath || file.name}</span>
                            </div>
                            <button
                              onClick={() => removeProblemFile(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {testDataFiles.length > 0 && (
                    <div>
                      <h4 className="text-slate-300 text-sm mb-2">测试数据文件 ({testDataFiles.length})</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {testDataFiles.slice(0, 30).map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                            <div className="flex items-center min-w-0">
                              <FileText className="h-4 w-4 text-purple-400 mr-2 shrink-0" />
                              <span className="text-white text-sm truncate">{file.webkitRelativePath || file.name}</span>
                            </div>
                            <button
                              onClick={() => removeTestDataFile(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {testDataFiles.length > 30 && (
                          <div className="text-slate-400 text-sm text-center py-2">
                            还有 {testDataFiles.length - 30} 个文件未显示
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {importMode === 'ai' && problemFiles.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    已选择的文件 ({problemFiles.length})
                  </h3>
                  <button
                    onClick={() => setProblemFiles([])}
                    className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                  >
                    清空全部
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {problemFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center min-w-0">
                        <FileText className="h-5 w-5 text-cyan-400 mr-3 shrink-0" />
                        <span className="text-white truncate">
                          {file.webkitRelativePath || file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeProblemFile(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importMode === 'ai' && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                <div className="flex items-center mb-4">
                  <ClipboardPaste className="h-5 w-5 text-cyan-400 mr-2" />
                  <h3 className="text-lg font-semibold text-white">粘贴文本内容</h3>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                  placeholder="将题目文本直接粘贴到此处，支持多道题目的文本内容..."
                />
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleParse}
                disabled={
                  parsing || 
                  ((importMode === 'file' && problemFiles.length === 0) || 
                   (importMode === 'folder' && problemFiles.length + testDataFiles.length === 0) ||
                   (importMode === 'ai' && problemFiles.length === 0 && !pasteText.trim()))
                }
                className="flex items-center px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    开始解析
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {problems.length > 0 && (
          <>
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  解析结果预览
                  <span className="text-slate-400 text-base font-normal ml-2">
                    共 {problems.length} 道题目
                  </span>
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={handleBatchImport}
                    disabled={importing}
                    className="flex items-center px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {batchTotal > 1 ? `导入中 ${batchProgress}/${batchTotal} 批...` : '导入中...'}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        一键批量导入
                      </>
                    )}
                  </button>
                </div>
              </div>

              {importing && batchTotal > 1 && (
                <div className="mb-6 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-cyan-400 text-sm font-medium">
                      <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                      分批导入中...
                    </span>
                    <span className="text-cyan-300 text-sm">{batchProgress}/{batchTotal} 批</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress / batchTotal) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {importResult && (
                <div className="mb-6 p-4 rounded-lg bg-slate-700 border border-slate-600">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                      <span className="text-white">
                        成功: {importResult.succeeded}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-white">
                        失败: {importResult.failed}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      总计: {importResult.total}
                    </span>
                  </div>
                  {importResult.results && importResult.results.some((r) => !r.success) && (
                    <div className="mt-3 space-y-1">
                      {importResult.results
                        .filter((r) => !r.success)
                        .map((r, i) => (
                          <div key={i} className="text-red-400 text-sm">
                            {r.title ? `"${r.title}"` : `第 ${r.index + 1} 题`}导入失败: {r.message || '未知错误'}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {problems.map((problem, index) => (
                  <div
                    key={index}
                    className="bg-slate-700 rounded-lg p-5 border border-slate-600"
                  >
                    {editingIndex === index && editForm ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            编辑第 {index + 1} 题
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-300 text-sm rounded-lg transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              标题
                            </label>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) =>
                                updateEditField('title', e.target.value)
                              }
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                类型
                              </label>
                              <select
                                value={editForm.type}
                                onChange={(e) =>
                                  updateEditField('type', e.target.value)
                                }
                                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="PROGRAMMING">编程题</option>
                                <option value="CHOICE">选择题</option>
                                <option value="FILL_BLANK">填空题</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                难度
                              </label>
                              <select
                                value={editForm.difficulty}
                                onChange={(e) =>
                                  updateEditField('difficulty', e.target.value)
                                }
                                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="EASY">简单</option>
                                <option value="MEDIUM">中等</option>
                                <option value="HARD">困难</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            描述
                          </label>
                          <textarea
                            value={editForm.description}
                            onChange={(e) =>
                              updateEditField('description', e.target.value)
                            }
                            rows={4}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            标签（用逗号分隔）
                          </label>
                          <input
                            type="text"
                            value={editForm.tags?.join(', ') || ''}
                            onChange={(e) =>
                              updateEditField(
                                'tags',
                                e.target.value
                                  .split(',')
                                  .map((t) => t.trim())
                                  .filter((t) => t)
                              )
                            }
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>

                        {editForm.type === 'CHOICE' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-slate-300">
                                选项
                              </label>
                              <button
                                onClick={addEditChoice}
                                disabled={(editForm.choices?.length || 0) >= 8}
                                className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                添加选项
                              </button>
                            </div>
                            <div className="space-y-2">
                              {editForm.choices?.map((choice, ci) => (
                                <div
                                  key={ci}
                                  className="flex items-center gap-3"
                                >
                                  <span className="w-7 h-7 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded font-bold text-sm">
                                    {choice.key}
                                  </span>
                                  <input
                                    type="text"
                                    value={choice.text}
                                    onChange={(e) =>
                                      updateEditChoice(ci, e.target.value)
                                    }
                                    className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  />
                                  {(editForm.choices?.length || 0) > 2 && (
                                    <button
                                      onClick={() => removeEditChoice(ci)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                正确答案
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {editForm.choices?.map((choice) => (
                                  <button
                                    key={choice.key}
                                    onClick={() =>
                                      updateEditField(
                                        'correctAnswer',
                                        choice.key
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      editForm.correctAnswer === choice.key
                                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                                        : 'bg-slate-600 border-2 border-slate-500 text-slate-300 hover:border-slate-400'
                                    }`}
                                  >
                                    {choice.key}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {editForm.type === 'PROGRAMMING' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-slate-300">
                                测试用例
                              </label>
                              <button
                                onClick={addEditTestCase}
                                className="flex items-center text-sm text-cyan-400 hover:text-cyan-300"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                添加用例
                              </button>
                            </div>
                            <div className="space-y-3">
                              {editForm.testCases?.map((tc, tci) => (
                                <div
                                  key={tci}
                                  className="bg-slate-600 rounded-lg p-3"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-300 text-sm font-medium">
                                      测试点 {tci + 1}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <label className="flex items-center text-slate-400 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={tc.isSample}
                                          onChange={(e) =>
                                            updateEditTestCase(
                                              tci,
                                              'isSample',
                                              e.target.checked
                                            )
                                          }
                                          className="mr-1.5"
                                        />
                                        示例
                                      </label>
                                      {(editForm.testCases?.length || 0) > 1 && (
                                        <button
                                          onClick={() =>
                                            removeEditTestCase(tci)
                                          }
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <textarea
                                      value={tc.input}
                                      onChange={(e) =>
                                        updateEditTestCase(
                                          tci,
                                          'input',
                                          e.target.value
                                        )
                                      }
                                      rows={2}
                                      className="px-2 py-1.5 bg-slate-500 border border-slate-400 rounded text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                      placeholder="输入"
                                    />
                                    <textarea
                                      value={tc.output}
                                      onChange={(e) =>
                                        updateEditTestCase(
                                          tci,
                                          'output',
                                          e.target.value
                                        )
                                      }
                                      rows={2}
                                      className="px-2 py-1.5 bg-slate-500 border border-slate-400 rounded text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                      placeholder="输出"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {editForm.type === 'FILL_BLANK' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-slate-300">
                                填空答案
                              </label>
                              <button
                                onClick={addEditFillBlank}
                                disabled={(editForm.fillBlanks?.length || 0) >= 10}
                                className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                添加填空
                              </button>
                            </div>
                            <div className="space-y-2">
                              {editForm.fillBlanks?.map((fb, fbi) => (
                                <div
                                  key={fbi}
                                  className="flex items-center gap-3"
                                >
                                  <span className="w-7 h-7 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded font-bold text-sm">
                                    {fbi + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={fb}
                                    onChange={(e) =>
                                      updateEditFillBlank(fbi, e.target.value)
                                    }
                                    className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder={`第 ${fbi + 1} 个填空的答案`}
                                  />
                                  {(editForm.fillBlanks?.length || 0) > 1 && (
                                    <button
                                      onClick={() => removeEditFillBlank(fbi)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-sm font-mono">
                              #{index + 1}
                            </span>
                            <h3 className="text-white font-medium text-lg">
                              {problem.title || '未命名题目'}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                TYPE_COLORS[problem.type] ||
                                'text-slate-400 bg-slate-500/20'
                              }`}
                            >
                              {TYPE_MAP[problem.type] || problem.type}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                DIFFICULTY_COLORS[problem.difficulty] ||
                                'text-slate-400 bg-slate-500/20'
                              }`}
                            >
                              {DIFFICULTY_MAP[problem.difficulty] ||
                                problem.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(index)}
                              className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeProblem(index)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-400 text-sm line-clamp-3 mb-3">
                          {problem.description || '暂无描述'}
                        </p>

                        {problem.tags && problem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {problem.tags.map((tag, ti) => (
                              <span
                                key={ti}
                                className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {problem.type === 'PROGRAMMING' && (
                            <span>
                              测试用例: {problem.testCases?.length || 0}
                            </span>
                          )}
                          {problem.type === 'CHOICE' && (
                            <span>
                              选项: {problem.choices?.length || 0} | 正确答案:{' '}
                              {problem.correctAnswer || '-'}
                            </span>
                          )}
                          {problem.type === 'FILL_BLANK' && (
                            <span>
                              填空数: {problem.fillBlanks?.length || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => navigate('/admin/problems')}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                返回题目列表
              </button>
              <button
                onClick={handleBatchImport}
                disabled={importing || problems.length === 0}
                className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {batchTotal > 1 ? `导入中 ${batchProgress}/${batchTotal} 批...` : '导入中...'}
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    批量导入 ({problems.length} 题)
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
