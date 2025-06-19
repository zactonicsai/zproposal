import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Container, Box, Button, FormControl, InputLabel,
  Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';

// Define file type
interface ProposalFile {
  id: number;
  name: string;
  type: string;
  date: string;
  data: string; // Base64-encoded file data
}

const ProposalPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>('');
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedProposal, setGeneratedProposal] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    if (!localStorage.getItem('isAuthenticated')) {
      navigate('/');
    }
    // Load files from localStorage
    const storedFiles: ProposalFile[] = JSON.parse(localStorage.getItem('proposalFiles') || '[]');
    setFiles(storedFiles);
    
    // Load API key from localStorage
    const storedApiKey = localStorage.getItem('claudeApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file || !docType) {
      alert('Please select a file and document type');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const newFile: ProposalFile = {
        id: Date.now(),
        name: file.name,
        type: docType,
        date: new Date().toLocaleDateString(),
        data: base64Data // Store Base64 data
      };

      const updatedFiles = [...files, newFile];
      try {
        setFiles(updatedFiles);
        localStorage.setItem('proposalFiles', JSON.stringify(updatedFiles));
        alert('File uploaded successfully!');
      } catch (e) {
        alert('Error saving to local storage: Storage may be full');
        console.error(e);
      }
      setFile(null);
      setDocType('');
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    };
    reader.onerror = () => {
      alert('Error reading file');
    };
    reader.readAsDataURL(file); // Convert file to Base64
  };

  const handleSelect = (id: number) => {
    setSelectedFiles(prev =>
      prev.includes(id)
        ? prev.filter(fileId => fileId !== id)
        : [...prev, id]
    );
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      alert('Please enter a valid API key');
      return;
    }
    localStorage.setItem('claudeApiKey', apiKey);
    setApiKeyDialogOpen(false);
    alert('API key saved successfully!');
  };

  const convertBase64ToText = (base64String: string): string => {
    try {
      // Remove data URL prefix if present
      const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
      
      // Decode base64 to text (for text files)
      const decoded = atob(base64Data);
      
      // Check if it's a text file by trying to decode as UTF-8
      try {
        return decodeURIComponent(escape(decoded));
      } catch {
        return decoded;
      }
    } catch (error) {
      console.error('Error converting base64 to text:', error);
      return '[Binary file content - cannot display as text]';
    }
  };

  const handleGenerateProposal = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    if (!apiKey) {
      setApiKeyDialogOpen(true);
      return;
    }

    setLoading(true);
    
    try {
      const selectedFileDetails = files.filter(file => selectedFiles.includes(file.id));
      
      // Prepare the content for each file
      const fileContents = selectedFileDetails.map(file => {
        const textContent = convertBase64ToText(file.data);
        return `\n\n=== ${file.name} (${file.type}) ===\n${textContent}`;
      }).join('\n');

      // Create the prompt
      const prompt = `Please generate a comprehensive business proposal based on the following uploaded documents. 

Document Types and Names:
${selectedFileDetails.map(file => `- ${file.name} (${file.type})`).join('\n')}

Please analyze these documents and create a well-structured proposal that incorporates the relevant information from each document type:
- Business Capability documents should inform the solution approach
- Proposal Templates should guide the structure and format  
- RFI/RFP documents should be addressed with specific responses

Generate a professional proposal with proper sections, executive summary, technical approach, and other standard proposal elements.

Here are the document contents:
${fileContents}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${errorData.error?.message || `${response.status} ${response.statusText}`}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from Claude API');
      }
      
      const proposal = data.content[0].text;
      
      setGeneratedProposal(proposal);
      setDialogOpen(true);
      
    } catch (error) {
      console.error('Error generating proposal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error generating proposal: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all documents? This action cannot be undone.')) {
      localStorage.removeItem('proposalFiles');
      setFiles([]);
      setSelectedFiles([]);
      alert('All documents have been cleared from local storage');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('isAuthenticated');
      navigate('/');
    }
  };

  const downloadProposal = () => {
    const blob = new Blob([generatedProposal], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedProposal);
      alert('Proposal copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please copy manually.');
    }
  };

  const deleteFile = (id: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      const updatedFiles = files.filter(file => file.id !== id);
      setFiles(updatedFiles);
      localStorage.setItem('proposalFiles', JSON.stringify(updatedFiles));
      setSelectedFiles(prev => prev.filter(fileId => fileId !== id));
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ZProposal by Zactonics
          </Typography>
          <Button color="inherit" onClick={() => setApiKeyDialogOpen(true)}>
            API Settings
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Upload Document
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              component="label"
            >
              Choose File
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept=".txt,.doc,.docx,.pdf,.rtf"
              />
            </Button>
            <Typography sx={{ flexGrow: 1, minWidth: '200px' }}>
              {file ? file.name : 'No file selected'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                label="Document Type"
              >
                <MenuItem value="Business Capability">Business Capability</MenuItem>
                <MenuItem value="Proposal Template">Proposal Template</MenuItem>
                <MenuItem value="RFI/RFP">RFI/RFP</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || !docType}
            >
              Upload
            </Button>
          </Box>
        </Box>

        <Typography variant="h5" gutterBottom>
          Uploaded Files ({files.length})
        </Typography>
        
        {files.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No files uploaded yet. Upload your first document above.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Select</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Document Type</TableCell>
                  <TableCell>Upload Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map(file => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => handleSelect(file.id)}
                      />
                    </TableCell>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{file.type}</TableCell>
                    <TableCell>{file.date}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => deleteFile(file.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleGenerateProposal}
            disabled={loading || selectedFiles.length === 0}
            sx={{ minHeight: 48 }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Generating Proposal...
              </Box>
            ) : (
              `Generate Proposal (${selectedFiles.length} selected)`
            )}
          </Button>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={handleReset}
            disabled={files.length === 0}
          >
            Reset All
          </Button>
        </Box>
      </Container>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Claude API Settings</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Claude API Key"
            type="password"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            helperText="Enter your Anthropic Claude API key. Get one at https://console.anthropic.com/"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveApiKey} variant="contained" disabled={!apiKey.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generated Proposal Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Generated Proposal</DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '0.9rem', 
              maxHeight: '60vh', 
              overflow: 'auto',
              p: 2,
              bgcolor: '#f5f5f5',
              borderRadius: 1
            }}
          >
            {generatedProposal}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={copyToClipboard} variant="outlined">
            Copy to Clipboard
          </Button>
          <Button onClick={downloadProposal} variant="outlined">
            Download
          </Button>
          <Button onClick={() => setDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProposalPage;